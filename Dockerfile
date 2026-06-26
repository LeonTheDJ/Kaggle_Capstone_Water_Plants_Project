# --- Stage 1: Build the Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copy frontend configuration and install dependencies
COPY frontend/package.json ./
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Build the frontend (outputs static assets to /app/frontend/dist by default)
RUN npm run build

# --- Stage 2: Create the Python Runtime ---
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend codebase
COPY backend/ ./backend/

# Copy MCP server codebase
COPY mcp_server/ ./mcp_server/

# Copy the built static frontend assets from Stage 1 into backend/static
COPY --from=frontend-builder /app/frontend/dist ./backend/static

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Cloud Run defaults to 8080
EXPOSE 8080

# Run FastAPI backend using uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
