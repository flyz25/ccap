from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.inspection import inspect
from sqlalchemy.orm import Session

from app.repositories.datasets import DatasetRepository
from app.schemas.common import DatasetFilters, PageMeta, PaginatedResponse


def serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    return value


class DatasetService:
    def __init__(self, db: Session) -> None:
        self.repo = DatasetRepository(db)

    def list_dataset(
        self,
        dataset: str,
        *,
        page: int,
        page_size: int,
        area: str | None = None,
        development_type: str | None = None,
        land_use: str | None = None,
    ) -> PaginatedResponse:
        rows, total = self.repo.list(
            dataset,
            page=page,
            page_size=page_size,
            filters={"area": area, "development_type": development_type, "land_use": land_use},
        )
        return PaginatedResponse(
            meta=PageMeta(page=page, page_size=page_size, total=total),
            items=[self.serialize_model(row) for row in rows],
        )

    def filters(self, dataset: str = "ecc_spk_map") -> DatasetFilters:
        model = self.repo.model_for(dataset)
        area_column = "area" if hasattr(model, "area") else "kawasan_kajian"
        values = self.repo.distinct_values(
            dataset,
            [area_column, "jenis_pembangunan", "guna_tanah", "ketinggian_tanah"],
        )
        return DatasetFilters(
            areas=values.get(area_column, []),
            development_types=values.get("jenis_pembangunan", []),
            land_uses=values.get("guna_tanah", []),
            height_classes=values.get("ketinggian_tanah", []),
        )

    def import_history(self, limit: int = 10):
        return self.repo.latest_imports(limit=limit)

    def serialize_model(self, row: Any) -> dict[str, Any]:
        data: dict[str, Any] = {}
        for column in inspect(row.__class__).columns:
            if column.key == "geom":
                continue
            data[column.key] = serialize_value(getattr(row, column.key))
        return data
