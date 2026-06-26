import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for structured output from the LLM
class SinglePlantAnalysis(BaseModel):
    plant_id: str
    moisture_level: int = Field(..., description="Estimated soil moisture percentage from 0 (bone dry) to 100 (fully saturated)")
    status: str = Field(..., description="Must be one of: 'Water Now' (very dry), 'Water Soon' (moderately dry), or 'Healthy' (well watered)")
    next_watering_date: str = Field(..., description="Estimated ISO date string (YYYY-MM-DD) for when the plant will next require watering")
    explanation: str = Field(..., description="A concise 1-2 sentence explanation in German of why this decision was made, citing weather and sun exposure.")

class BatchAnalysisResponse(BaseModel):
    analyses: List[SinglePlantAnalysis]

# Initialize Gemini Client
# The client automatically uses the GEMINI_API_KEY environment variable.
def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable is not set. The analysis will fail.")
    return genai.Client()

async def run_mcp_geocoding(city: str, zip_code: str) -> Dict[str, Any]:
    """
    Connects to the local Weather MCP server to resolve coordinates for a location.
    """
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server/weather_mcp.py"]
    )
    
    try:
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                # Call the geocode tool
                response = await session.call_tool(
                    "geocode_location",
                    arguments={"city": city, "zip_code": zip_code}
                )
                
                # Check for errors in tool output
                if not response.content or len(response.content) == 0:
                    return {"error": "Geocoding tool returned empty response"}
                
                # Parse output (which is JSON text representation)
                result = json.loads(response.content[0].text)
                return result
    except Exception as e:
        logger.error(f"Error calling geocode MCP tool: {str(e)}")
        return {"error": f"MCP connection failed: {str(e)}"}

async def run_mcp_weather(latitude: float, longitude: float, past_days: int) -> Dict[str, Any]:
    """
    Connects to the local Weather MCP server to fetch historical weather data.
    """
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server/weather_mcp.py"]
    )
    
    try:
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                # Call weather history tool
                response = await session.call_tool(
                    "get_weather_history_and_forecast",
                    arguments={"latitude": latitude, "longitude": longitude, "past_days": past_days}
                )
                
                if not response.content or len(response.content) == 0:
                    return {"error": "Weather tool returned empty response"}
                
                result = json.loads(response.content[0].text)
                return result
    except Exception as e:
        logger.error(f"Error calling weather MCP tool: {str(e)}")
        return {"error": f"MCP connection failed: {str(e)}"}

async def analyze_plants_watering(balcony_config: dict, plants: list) -> List[dict]:
    """
    Orchestrates the analysis of plants.
    1. Resolves balcony geocoding via MCP.
    2. Fetches historical weather data since the oldest lastWatered date.
    3. Feeds weather and plant-specific sun exposure to the Gemini Agent to calculate schedules.
    """
    if not plants:
        return []
        
    city = balcony_config.get("city", "")
    zip_code = balcony_config.get("zipCode", "")
    is_covered = balcony_config.get("isCovered", False) # True if covered balcony (no rain)
    
    # 1. Geocode location
    geo_data = await run_mcp_geocoding(city, zip_code)
    if "error" in geo_data:
        logger.warning(f"Geocoding failed, falling back to Berlin defaults. Error: {geo_data['error']}")
        # Fallback to Berlin coordinates if geocoding fails
        latitude, longitude = 52.52, 13.40
        location_name = "Berlin (Fallback)"
    else:
        latitude = geo_data["latitude"]
        longitude = geo_data["longitude"]
        location_name = geo_data.get("display_name", f"{city} {zip_code}")
        
    # 2. Determine how far back we need weather data
    # Calculate days since last watered for all plants to find the max required days
    now = datetime.now(timezone.utc)
    max_days_past = 3 # default to at least 3 days
    
    for plant in plants:
        last_watered_str = plant.get("lastWatered")
        if last_watered_str:
            try:
                last_watered = datetime.fromisoformat(last_watered_str.replace("Z", "+00:00"))
                days_since = (now - last_watered).days
                if days_since > max_days_past:
                    max_days_past = days_since
            except Exception as e:
                logger.error(f"Error parsing date {last_watered_str}: {str(e)}")
                
    # Limit past days search range to 30 days to keep prompt clean
    past_days = min(max(3, max_days_past), 30)
    
    # 3. Fetch weather history from MCP
    weather_data = await run_mcp_weather(latitude, longitude, past_days)
    if "error" in weather_data:
        logger.error(f"Weather retrieval failed: {weather_data['error']}")
        # Fallback empty weather dataset to let LLM estimate based on general profiles
        weather_data = {"note": "Weather service unavailable. Estimate based on general climate."}
        
    # 4. Construct the prompt for the Gemini Agent
    prompt = f"""
You are the FloraCast Botanical and Watering Agent. Your task is to analyze the watering requirements of the user's balcony plants.

### Balcony Location:
- City/Location: {location_name}
- Coordinates: Latitude {latitude}, Longitude {longitude}
- Balcony Type: {"Covered (roofed, no rain reaches plants)" if is_covered else "Open (rain reaches plants)"}

### Weather Conditions over the past {past_days} days:
{json.dumps(weather_data, indent=2)}

### Plants to Analyze:
{json.dumps(plants, indent=2)}

### Instructions:
For each plant in the list:
1. Retrieve its typical watering profile (e.g. high/medium/low water needs, preferred environment).
2. Calculate the estimated soil moisture level (0-100%) based on:
   - The time since it was last watered.
   - The weather history: Higher temperatures and lower humidity dry plants out faster. 
   - Sun exposure: The plant's specific 'sunHours' per day.
   - Rain: If the balcony is NOT covered, subtract the precipitation (in mm) from the water deficit (each 1mm of rain provides moisture, but if the balcony is covered, ignore rain).
3. Determine the status:
   - 'Water Now': If moisture is below 25% or watering is severely overdue.
   - 'Water Soon': If moisture is between 25% and 50% or it will need water in the next 24 hours.
   - 'Healthy': If moisture is above 50% and it doesn't need watering yet.
4. Predict the next watering date.
5. Provide a short explanation (1-2 sentences) in German summarizing your reasoning (mentioning recent temperatures, sun hours, and rain if applicable).

Return the results matching the BatchAnalysisResponse schema.
"""

    try:
        client = get_gemini_client()
        # Use gemini-2.5-flash for structured response schema
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BatchAnalysisResponse,
                temperature=0.2
            )
        )
        
        # Parse the structured JSON response
        analysis_data = json.loads(response.text)
        return analysis_data.get("analyses", [])
        
    except Exception as e:
        logger.error(f"Gemini API invocation failed: {str(e)}")
        # Return fallback items if API fails
        fallback_results = []
        for plant in plants:
            fallback_results.append({
                "plant_id": plant.get("id"),
                "moisture_level": 50,
                "status": "Healthy",
                "next_watering_date": datetime.now().strftime("%Y-%m-%d"),
                "explanation": "Analyse konnte nicht durchgeführt werden. (API-Fehler: " + str(e) + ")"
            })
        return fallback_results
