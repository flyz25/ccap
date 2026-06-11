# Installation Guide

## Prerequisites

- Docker Desktop or Docker Engine with Compose
- At least 6 GB free RAM for PostgreSQL, Superset, backend, and Angular/Nginx build
- The supplied Excel workbook in the project root:
  `CEKAL DATABASE - FINALIZED 11_7_2025.xlsx`

## Start The MVP

```bash
docker compose up -d
```

The first run builds Python and Angular images, creates the PostGIS database, runs migrations, seeds users, and imports the Excel workbook.

## Services

| Service | URL | Purpose |
| --- | --- | --- |
| Frontend | http://localhost:8080 | Angular dashboard served by Nginx |
| Backend | http://localhost:8001 | FastAPI application |
| Swagger UI | http://localhost:8001/docs | OpenAPI documentation |
| PostgreSQL | localhost:5432 | PostgreSQL 17 + PostGIS |
| pgAdmin | http://localhost:5050 | Database administration |
| Apache Superset | http://localhost:8088 | Self-service BI, SQL Lab, charts, and dashboards |

pgAdmin login:

- Email: `admin@ccap.gov.my`
- Password: `admin`

Database connection inside pgAdmin:

- Host: `postgres`
- Port: `5432`
- Database: `ccap`
- Username: `ccap`
- Password: `ccap`

Superset login:

- Username: `admin`
- Password: `password123`

The Superset initialization container automatically:

- creates a separate `superset_metadata` database
- runs Superset database migrations
- creates the local admin account
- registers the CCAP PostgreSQL analytics connection
- registers the main CCAP analytics tables as Superset datasets

The registered analytics connection uses:

```text
postgresql+psycopg2://ccap:ccap@postgres:5432/ccap
```

The bootstrap also creates and publishes:

- Dashboard: `CCAP Executive Overview`
- URL: http://localhost:8088/superset/dashboard/ccap-executive-overview/
- KPI, capacity comparison, area ranking, population trend, status, and land-use charts

## Demo Login

All demo users use password `password123`.

| Username | Role |
| --- | --- |
| `admin` | Admin |
| `planner` | Planner |
| `analyst` | Analyst |
| `viewer` | Viewer |

## Rebuild

```bash
docker compose up -d --build
```

## Stop

```bash
docker compose down
```

To remove database volumes:

```bash
docker compose down -v
```
