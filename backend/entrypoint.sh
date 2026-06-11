#!/usr/bin/env bash
set -euo pipefail

echo "Waiting for PostgreSQL..."
python - <<'PY'
import time
from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()
for attempt in range(60):
    try:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        break
    except Exception as exc:
        if attempt == 59:
            raise
        time.sleep(2)
PY

alembic upgrade head
python -m app.utils.seed_demo
python /app/import_excel.py --file "${SOURCE_EXCEL_PATH:-/app/CEKAL DATABASE - FINALIZED 11_7_2025.xlsx}"

exec uvicorn app.main:app --host 0.0.0.0 --port 8000

