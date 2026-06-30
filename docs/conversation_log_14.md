# Conversation Log 14: Security Mitigations (STRIDE Implementation)

**Date:** June 30, 2026  
**Participants:** User & Antigravity (AI Coding Assistant)  
**Topic:** Implementing security mitigations mapped in the STRIDE threat model assessment, covering geocoding/weather API caching, SQLite audit logging, global error handling, and API Key checking.

---

## 1. Global Exception Handling (Information Disclosure)
Added custom FastAPI exception handlers to prevent raw Python stack traces, database details, or local file system paths from leaking in HTTP responses:
- Registered `@app.exception_handler(Exception)` on both backend instances ([main.py](../backend/main.py) and [main.py](../submission_frontend/main.py)).
- Logs full traceback details internally using `logger.error(..., exc_info=True)`.
- Returns a standardized JSON response: `{"detail": "An internal server error occurred. Please contact the administrator."}` with HTTP status code `500`.

---

## 2. Weather & Geocoding Caching (Denial of Service)
Built a lightweight, in-memory `WeatherCache` class with a Time-To-Live (TTL) of 3 hours to avoid hitting third-party limits:
- **Presentation Dashboard Caching:** Integrated caching in [main.py](../submission_frontend/main.py) for the `/api/weather/{city}` endpoint and `/api/analyze` geocoding/forecast calls.
- **Local CLI/Agent Caching:** Integrated caching in [agents.py](../backend/agents.py) for the MCP geocoding and weather tool lookups.

---

## 3. Persistent SQLite Audit Logging (Repudiation)
Replaced flaccid in-memory session logging with a persistent SQL transaction recorder:
- Created a local database `audit_logs.db` utilizing the native Python `sqlite3` library (requiring no extra pip packages).
- Configured table `audit_logs` to save timestamps, plant name, species, resulting status, calculated moisture, and rain-watering flags.
- Logs transactions immediately after calculations are performed in both backend endpoints.

---

## 4. API Key Verification & Frontend UI Settings (Spoofing & Privilege Elevation)
Created an optional token authentication boundary:
- **Backend Authorization:** If `FLORAWAVE_API_KEY` is defined in environmental configurations, requests to `/api/analyze` must contain a valid `X-API-Key` header (or `api_key` query parameter fallback for GET endpoints).
- **Frontend Configuration:** Added an optional password input field `API Key` in the Balcony Settings modal inside [index.html](../frontend/index.html).
- **Network Headers:** Updated [main.js](../frontend/src/main.js) to store `apiKey` in the local balcony state and append it to all fetch parameters/headers.

---

## 5. Build & Validation
- Compiled updated Vite assets (`npm run build`) and copied bundles to static delivery targets.
- Verified that all Python and JavaScript files compiled without errors.
- Restarted the backend server on port `8001`.

---

## 6. Hotfix: Rain-Watering Cache Poisoning Bug
- **Issue:** An indentation error in [main.py](../submission_frontend/main.py#L327-L336) caused the mock weather fallback block to execute even on successful API queries. Since Python dictionaries are passed by reference, this mutation mutated the weather dataset inside the `WEATHER_CACHE` object itself, permanently poisoning subsequent cache hits with 0.0mm of rain.
- **Fix:** Indented the mock weather fallback array construction strictly under the `except` block. Restarted the presentation server to flush the poisoned in-memory cache.

