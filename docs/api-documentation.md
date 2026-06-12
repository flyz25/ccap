# API Documentation

FastAPI generates live OpenAPI documentation at:

```text
http://localhost:8001/docs
```

## Authentication

`POST /api/auth/login`

Request:

```json
{
  "username": "admin",
  "password": "password123"
}
```

Response includes a JWT bearer token and user profile. Pass the token as:

```text
Authorization: Bearer <token>
```

`GET /api/auth/me` returns the current user.

## Analytics Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/dashboard` | KPIs, filters, and dashboard charts |
| `GET /api/ecc` | ECC SPK records |
| `GET /api/zoning` | Zoning records |
| `GET /api/optimum` | Optimum records |
| `GET /api/ketepuan` | Ketepuan records |
| `GET /api/population` | Overall population records |

## Capacity Formula Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/capacity/methodology` | Active RW CEKAL formula definition |
| `GET /api/capacity/factors` | `CF` and `MC` master data by dataset and area |
| `PATCH /api/capacity/factors/{id}` | Update a factor row; Admin/Planner only |
| `POST /api/capacity/recalculate` | Run formula audit manually; Admin/Planner only |
| `GET /api/capacity/runs` | Formula audit run history |
| `GET /api/capacity/runs/{id}/summary` | Audit summary by dataset and area |
| `GET /api/capacity/audit` | Paginated row-level stored-versus-calculated results |

Audit filters:

- `page`
- `page_size`
- `run_id`
- `dataset_scope`
- `area`
- `status`

Formula audit statuses:

- `pass`: workbook values match calculated values.
- `warning`: small rounding delta or missing stored comparison.
- `fail`: material mismatch.
- `missing_factor`: PCC can be calculated but `CF/MC` is unavailable.
- `missing_input`: required PCC input is unavailable.

Dashboard capacity status uses audited area-level saturation logic:

```text
capacity_load = MAX(bil_penduduk) + MAX(bil_pengunjung)
capacity = SUM(ecc)
saturation_pct = capacity_load / capacity * 100
```

Bands are `Sesuai` below 70%, `Sederhana` from 70% to below 100%, and `Kritikal` at or above 100%.

Common query parameters:

- `page`
- `page_size`
- `area`
- `development_type`
- `land_use`

## GIS Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/map/layers` | Current and future map layer metadata |
| `GET /api/map/points?dataset=ecc_spk_map` | GeoJSON FeatureCollection for mapped points |

Supported point datasets:

- `ecc_spk_map`
- `zoning_map`
- `optimum_map`
- `ketepuan`

## Upload Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/upload/excel` | Re-import Excel workbook |
| `GET /api/upload/history` | Import batch history |

Upload is restricted to Admin, Planner, and Analyst roles.
Successful Excel imports trigger a capacity formula audit for the imported batch without overwriting workbook PCC/RCC/ECC values.
