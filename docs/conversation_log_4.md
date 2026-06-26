# Conversation Log 4: Deterministic Botanical Calculation & Hybrid Agent Integration

**Date:** June 26, 2026  
**Participants:** User & Antigravity (AI Coding Assistant)  
**Topic:** Transition from open-ended LLM heuristics to a hybrid deterministic model (Python simulation + Gemini explanation), mapping plants to a category database, and simplifying the botanical skill guidelines.

---

## 1. Project Overview
To ensure highly accurate and believable soil moisture estimations, the plant watering analysis was upgraded. The system now uses a structured category database and a deterministic mathematical simulation script, while leveraging the Gemini LLM solely for context-aware natural language explanations in German.

---

## 2. Design Discussion & Revisions

### Moisture Calculations (Critique & Improvements)
*   **Original Idea:** Let the LLM directly estimate moisture levels and next watering dates based on the raw weather history and plant settings.
*   **Discussion:** The LLM-generated math proved unreliable and inconsistent. The agent frequently had rounding errors or made non-linear leaps that did not match physical evaporation formulas.
*   **Solution:** We moved the core daily soil-moisture simulation to a deterministic Python script. The script calculates moisture depletion day-by-day based on temperature, relative humidity, configured sun hours (relative to category optimal hours), and rain (if the balcony is open).

### Plant Species Database (Solving Blind Spots)
*   **Original Idea:** Have a large database of specific plant species.
*   **Discussion:** A flat database of individual species has infinite blind spots (e.g., misspelled inputs, rare plants). 
*   **Solution:** We restructured the plant database (`resources/plant_database.json`) to define 11 standardized plant categories (e.g., "Kräuter (Wasserliebend)", "Sukkulenten & Kakteen", "Balkongemüse"). The frontend was updated with a dropdown selector containing these categories, ensuring perfect mapping between user input and baseline metrics.

### Skill Guidelines Simplification
*   **Original Idea:** Include detailed LaTeX equations and math factors in `SKILL.md`.
*   **Discussion:** Since calculations are now handled by the Python script, the LLM does not need to parse or replicate LaTeX equations. Having them in `SKILL.md` added prompt weight and could confuse the model.
*   **Solution:** We removed the mathematical formulas and the `### Parameters & Factors:` section from `SKILL.md`. The file was simplified to focus on conceptual rules, helping the Gemini agent understand the relationships so it can draft accurate, context-aware German explanations (e.g., explaining why a plant is healthy or needs water).

---

## 3. Agreed Architecture

*   **Frontend:** Vite/Vanilla CSS web app featuring a dropdown list of 11 plant categories. Persists state locally in `localStorage`.
*   **Local Calculation Script:** [moisture_calculator.py](../skills/botanical-watering-skill/scripts/moisture_calculator.py) inside the skill folder. Dynamically loaded by the backend to simulate daily soil moisture levels.
*   **AI Agent (Gemini):** Calls `gemini-2.5-flash` with structured Pydantic response models. Receives the pre-calculated results and drafts concise 1-2 sentence German explanations for the UI.
*   **MCP Server:** Custom Weather & Geocoding MCP server fetching actual historical weather from Open-Meteo.
*   **Git Integration:** Clean repository with all code pushed to GitHub and `.env` properly gitignored.
