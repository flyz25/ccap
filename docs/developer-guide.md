# Developer Guide

## Backend Development

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python ../import_excel.py
uvicorn app.main:app --reload
```

Use a PostgreSQL/PostGIS database and set `DATABASE_URL` if it differs from the Docker default.

## Frontend Development

```bash
cd frontend
npm install
npm start
```

The development frontend uses:

```text
http://localhost:8000/api
```

from `src/environments/environment.ts`.

## ETL Design

`ExcelImporter` reads all worksheets with pandas, normalizes headers, maps expected sheets to typed tables, and uses a SHA-256 row hash for idempotent re-import.

Header normalization handles fields such as:

- `No.` to `source_no`
- `Senario 1: Guna Tanah Zoning RT (Zoning)` to `guna_tanah`
- `Senario : Guna Tanah Optimum (Optimum)` to `guna_tanah`

## Adding A New Dataset API

1. Add a SQLAlchemy model in `backend/app/models`.
2. Add it to `DATASET_MODELS` in `backend/app/repositories/datasets.py`.
3. Add sheet mapping in `ExcelImporter`.
4. Add a route module under `backend/app/api/routes`.
5. Register the route in `backend/app/api/router.py`.
6. Add frontend service/page integration as needed.

## Adding A Superset Dataset

1. Add or update a durable analytics view in `docker/superset/create_analytics_views.py`.
2. Register the table or view in `docker/superset/register_ccap_datasets.py`.
3. Add charts or dashboard layout changes in `docker/superset/register_executive_dashboard.py`.
4. Rebuild and rerun the idempotent bootstrap:

```bash
docker compose up -d --build superset
```

Open the published executive dashboard at:

```text
http://localhost:8088/superset/dashboard/ccap-executive-overview/
```

## Security Notes

- Replace `JWT_SECRET_KEY` before any shared deployment.
- Replace `SUPERSET_SECRET_KEY` and the default Superset admin password before any shared deployment.
- Demo users are for MVP use only.
- Use HTTPS and managed secrets for government deployment.
- Add refresh tokens, password policy, audit logging, and identity federation in later phases.
