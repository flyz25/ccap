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
