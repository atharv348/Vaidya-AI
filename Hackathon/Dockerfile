FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
        curl \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/ ./backend/
COPY data/ ./data/
COPY models/ ./models/
COPY src/ ./src/

RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r backend/requirements.txt

RUN mkdir -p /app/backend/uploads/disability_docs /app/backend/uploads/vaidyaai_predictions

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]