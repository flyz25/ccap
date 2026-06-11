from app.schemas.common import ChartData, DatasetFilters, KpiCard

from pydantic import BaseModel


class DashboardOverview(BaseModel):
    kpis: list[KpiCard]
    filters: DatasetFilters
    population_trend: ChartData
    capacity_comparison: ChartData
    ecc_distribution: ChartData
    area_ranking: ChartData


class DatasetSummary(BaseModel):
    rows: int
    filters: DatasetFilters
    charts: dict

