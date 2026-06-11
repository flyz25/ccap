from decimal import Decimal
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.analytics import EccSpkMap, OverallPopulation
from app.repositories.datasets import DatasetRepository
from app.schemas.common import ChartData, ChartSeries, DatasetFilters, KpiCard
from app.schemas.dashboard import DashboardOverview


def as_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = DatasetRepository(db)

    def overview(
        self,
        *,
        area: str | None = None,
        development_type: str | None = None,
        land_use: str | None = None,
    ) -> DashboardOverview:
        filters = self._filters()
        base = select(EccSpkMap)
        base = self.repo.apply_filters(
            base,
            EccSpkMap,
            {"area": area, "development_type": development_type, "land_use": land_use},
        ).subquery()

        total_areas = self.db.scalar(select(func.count(func.distinct(base.c.area)))) or 0
        avg_pcc, avg_rcc, avg_ecc = self.db.execute(
            select(func.avg(base.c.pcc), func.avg(base.c.rcc), func.avg(base.c.ecc))
        ).one()

        latest_year = self.db.scalar(select(func.max(OverallPopulation.tahun)))
        total_population = 0
        if latest_year:
            total_population = self.db.scalar(
                select(func.sum(OverallPopulation.injected_population_growth)).where(OverallPopulation.tahun == latest_year)
            ) or 0

        return DashboardOverview(
            kpis=[
                KpiCard(label="Total Population", value=as_float(total_population), unit="people", trend=f"{latest_year or '-'}"),
                KpiCard(label="Total Areas", value=int(total_areas), unit="areas"),
                KpiCard(label="Average PCC", value=round(as_float(avg_pcc), 2)),
                KpiCard(label="Average RCC", value=round(as_float(avg_rcc), 2)),
                KpiCard(label="Average ECC", value=round(as_float(avg_ecc), 2)),
            ],
            filters=filters,
            population_trend=self._population_trend(),
            capacity_comparison=self._capacity_comparison(base),
            ecc_distribution=self._ecc_distribution(base),
            area_ranking=self._area_ranking(base),
        )

    def _filters(self) -> DatasetFilters:
        values = self.repo.distinct_values(
            "ecc_spk_map",
            ["area", "jenis_pembangunan", "guna_tanah", "ketinggian_tanah"],
        )
        return DatasetFilters(
            areas=values["area"],
            development_types=values["jenis_pembangunan"],
            land_uses=values["guna_tanah"],
            height_classes=values["ketinggian_tanah"],
        )

    def _population_trend(self) -> ChartData:
        rows = self.db.execute(
            select(
                OverallPopulation.tahun,
                func.sum(OverallPopulation.normal_population_growth),
                func.sum(OverallPopulation.injected_population_growth),
            )
            .group_by(OverallPopulation.tahun)
            .order_by(OverallPopulation.tahun)
        ).all()
        return ChartData(
            labels=[str(row[0]) for row in rows],
            series=[
                ChartSeries(name="Normal Growth", data=[as_float(row[1]) for row in rows]),
                ChartSeries(name="Injected Growth", data=[as_float(row[2]) for row in rows]),
            ],
        )

    def _capacity_comparison(self, base) -> ChartData:
        rows = self.db.execute(
            select(base.c.guna_tanah, func.avg(base.c.pcc), func.avg(base.c.rcc), func.avg(base.c.ecc))
            .where(base.c.guna_tanah.is_not(None))
            .group_by(base.c.guna_tanah)
            .order_by(desc(func.avg(base.c.ecc)))
            .limit(12)
        ).all()
        return ChartData(
            labels=[str(row[0]) for row in rows],
            series=[
                ChartSeries(name="PCC", data=[round(as_float(row[1]), 2) for row in rows]),
                ChartSeries(name="RCC", data=[round(as_float(row[2]), 2) for row in rows]),
                ChartSeries(name="ECC", data=[round(as_float(row[3]), 2) for row in rows]),
            ],
        )

    def _ecc_distribution(self, base) -> ChartData:
        rows = self.db.execute(
            select(base.c.ketinggian_tanah, func.avg(base.c.ecc))
            .where(base.c.ketinggian_tanah.is_not(None))
            .group_by(base.c.ketinggian_tanah)
            .order_by(base.c.ketinggian_tanah)
        ).all()
        return ChartData(
            labels=[str(row[0]) for row in rows],
            series=[ChartSeries(name="Average ECC", data=[round(as_float(row[1]), 2) for row in rows])],
        )

    def _area_ranking(self, base) -> ChartData:
        rows = self.db.execute(
            select(base.c.area, func.sum(base.c.ecc))
            .where(base.c.area.is_not(None))
            .group_by(base.c.area)
            .order_by(desc(func.sum(base.c.ecc)))
            .limit(10)
        ).all()
        return ChartData(
            labels=[str(row[0]) for row in rows],
            series=[ChartSeries(name="Total ECC", data=[round(as_float(row[1]), 2) for row in rows])],
        )

