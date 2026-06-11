# Architecture

CCAP is split into independently deployable frontend, backend, business intelligence, and database layers. The MVP keeps implementation modular so future PCC, RCC, ECC, scenario, GIS, GeoServer, ArcGIS, AI prediction, and DSS modules can be added with minimal refactoring.

```mermaid
flowchart LR
  U[User Browser] --> N[Nginx / Angular Frontend]
  N -->|/api| B[FastAPI Backend]
  B --> S[Services Layer]
  S --> R[Repository Layer]
  R --> DB[(PostgreSQL 17 + PostGIS)]
  U --> BI[Apache Superset]
  BI --> AV[Analytics Views]
  AV --> DB
  B --> ETL[Excel ETL]
  ETL --> DB
  XLSX[Excel Workbook] --> ETL
  PG[pgAdmin] --> DB
```

## Business Intelligence

Apache Superset uses a separate `superset_metadata` database for its configuration while querying the CCAP database through the `CCAP PostgreSQL` connection. Docker bootstrap scripts create durable analytics views, register datasets, and publish the `CCAP Executive Overview` dashboard.

| Component | Path | Responsibility |
| --- | --- | --- |
| Superset image and configuration | `docker/superset` | Superset runtime, metadata initialization, and CCAP connection |
| Analytics views | `docker/superset/create_analytics_views.py` | Stable, aggregated data sources for executive charts |
| Dashboard bootstrap | `docker/superset/register_executive_dashboard.py` | Idempotent chart and dashboard publication |

## Backend Layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| API | `backend/app/api/routes` | HTTP endpoints and request dependencies |
| Services | `backend/app/services` | Business logic, dashboard aggregation, map GeoJSON, ETL |
| Repositories | `backend/app/repositories` | SQLAlchemy query and persistence access |
| Models | `backend/app/models` | SQLAlchemy entities and PostGIS geometry |
| Schemas | `backend/app/schemas` | Pydantic response/request contracts |
| Core | `backend/app/core` | Config, database, security, auth dependencies |

## Frontend Modules

| Page | Path | Purpose |
| --- | --- | --- |
| Login | `frontend/src/app/features/login` | JWT authentication |
| Executive Dashboard | `features/dashboard` | KPI cards and summary charts |
| GIS Map | `features/map` | OpenLayers point map and popups |
| Population Analytics | `features/population` | Population trend and ranking charts |
| Capacity Analytics | `features/capacity` | PCC, RCC, ECC, current vs optimum |
| Zoning Analytics | `features/zoning` | Land use and zoning analysis |
| Data Management | `features/data-management` | Imported data, history, Excel re-import |

## Future Integration Points

- PCC/RCC/ECC calculation engines: add service modules under `backend/app/services`.
- Scenario simulation: add scenario tables and route modules without changing existing dataset APIs.
- GeoServer/ArcGIS: expose PostGIS layers through dedicated integration services.
- WMS/WFS/WMTS: extend `MapService.layers()` and Nginx proxy rules.
- AI prediction/DSS: add model output tables and dashboard route modules.
