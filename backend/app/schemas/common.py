from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


class PaginatedResponse(BaseModel):
    meta: PageMeta
    items: list[dict[str, Any]]


class DatasetFilters(BaseModel):
    areas: list[str] = []
    development_types: list[str] = []
    land_uses: list[str] = []
    height_classes: list[str] = []


class ImportBatchRead(BaseModel):
    id: int
    source_file: str
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    message: str | None = None
    total_rows: int
    inserted_rows: int
    updated_rows: int
    duplicate_rows: int
    sheet_summaries: dict | None = None

    model_config = {"from_attributes": True}


class KpiCard(BaseModel):
    label: str
    value: Decimal | float | int
    unit: str | None = None
    trend: str | None = None


class ChartSeries(BaseModel):
    name: str
    data: list[Decimal | float | int | None]


class ChartData(BaseModel):
    labels: list[str]
    series: list[ChartSeries]


class GeoJsonFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict[str, Any]] = Field(default_factory=list)

