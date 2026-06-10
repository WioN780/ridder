FROM python:3.13-slim

WORKDIR /app

# Install dependencies first for caching efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

EXPOSE 8000

# Bind dynamically to the port provided by the environment (Railway standard)
# or default to 8000 for local docker-compose environments.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
