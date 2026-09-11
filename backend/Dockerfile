FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for pymupdf and psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
