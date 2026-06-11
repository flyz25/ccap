FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /app/backend/requirements.txt

COPY backend /app/backend
COPY import_excel.py /app/import_excel.py
COPY ["CEKAL DATABASE - FINALIZED 11_7_2025.xlsx", "/app/CEKAL DATABASE - FINALIZED 11_7_2025.xlsx"]

RUN chmod +x /app/backend/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/backend/entrypoint.sh"]

