# CCAP

CCAP is the local MVP for the Carrying Capacity Analytics Platform. It imports the supplied Excel workbook into PostgreSQL/PostGIS and exposes a FastAPI backend plus an Angular government-style dashboard for carrying capacity, population, zoning, and GIS point analytics.

## Stack

- Frontend: Angular 20, Angular Material, TailwindCSS, OpenLayers, Apache ECharts
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic
- Database: PostgreSQL 17 with PostGIS
- Business intelligence: Apache Superset 6
- Infrastructure: Docker Compose, Nginx, pgAdmin

## Quick Start

```bash
docker compose up -d
```

Open:

- CCAP dashboard: http://localhost:8080
- FastAPI Swagger UI: http://localhost:8001/docs
- pgAdmin: http://localhost:5050
- Apache Superset: http://localhost:8088

Demo users all use password `password123`:

- `admin`
- `planner`
- `analyst`
- `viewer`

On startup, the backend runs Alembic migrations, seeds demo users, and imports `CEKAL DATABASE - FINALIZED 11_7_2025.xlsx`.

## Local ETL

When running outside Docker with a configured PostgreSQL/PostGIS database:

```bash
python import_excel.py
```

The importer auto-detects workbook sheets, normalizes column names, creates/updates known tables, hashes rows for idempotent re-import, logs import batches, and builds point geometry from latitude/longitude fields.

## Project Structure

```text
backend/    FastAPI application, ETL, Alembic migrations
frontend/   Angular 20 dashboard
database/   PostgreSQL/PostGIS initialization
docker/     Nginx runtime configuration
docs/       Installation, architecture, schema, API, developer guide
```

## Documentation

- [Installation Guide](docs/installation-guide.md)
- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [API Documentation](docs/api-documentation.md)
- [Developer Guide](docs/developer-guide.md)
