from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.analytics import EccSpkMap, Ketepuan, OptimumMap, OverallPopulation, ZoningMap
from app.models.imports import ImportBatch


DATASET_MODELS = {
    "ecc": EccSpkMap,
    "ecc_spk_map": EccSpkMap,
    "zoning": ZoningMap,
    "zoning_map": ZoningMap,
    "optimum": OptimumMap,
    "optimum_map": OptimumMap,
    "ketepuan": Ketepuan,
    "population": OverallPopulation,
    "overall_population": OverallPopulation,
}


class DatasetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def model_for(self, dataset: str):
        model = DATASET_MODELS.get(dataset)
        if model is None:
            raise KeyError(f"Unknown dataset '{dataset}'")
        return model

    def query(self, dataset: str) -> Select:
        return select(self.model_for(dataset))

    def count(self, dataset: str, filters: dict[str, Any] | None = None) -> int:
        model = self.model_for(dataset)
        stmt = select(func.count()).select_from(model)
        stmt = self.apply_filters(stmt, model, filters or {})
        return int(self.db.scalar(stmt) or 0)

    def list(
        self,
        dataset: str,
        *,
        page: int = 1,
        page_size: int = 50,
        filters: dict[str, Any] | None = None,
    ) -> tuple[list[Any], int]:
        model = self.model_for(dataset)
        stmt = select(model)
        stmt = self.apply_filters(stmt, model, filters or {})
        total = int(self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
        rows = list(
            self.db.scalars(
                stmt.order_by(getattr(model, "id")).offset((page - 1) * page_size).limit(page_size)
            )
        )
        return rows, total

    def distinct_values(self, dataset: str, columns: Iterable[str]) -> dict[str, list[str]]:
        model = self.model_for(dataset)
        result: dict[str, list[str]] = {}
        for column_name in columns:
            column = getattr(model, column_name, None)
            if column is None:
                result[column_name] = []
                continue
            stmt = select(column).where(column.is_not(None)).distinct().order_by(column)
            result[column_name] = [str(value) for value in self.db.scalars(stmt).all() if value not in (None, "")]
        return result

    def latest_imports(self, limit: int = 10) -> list[ImportBatch]:
        stmt = select(ImportBatch).order_by(ImportBatch.started_at.desc()).limit(limit)
        return list(self.db.scalars(stmt))

    def apply_filters(self, stmt: Select, model: Any, filters: dict[str, Any]) -> Select:
        area = filters.get("area")
        development_type = filters.get("development_type")
        land_use = filters.get("land_use")
        if area and hasattr(model, "area"):
            stmt = stmt.where(getattr(model, "area") == area)
        elif area and hasattr(model, "kawasan_kajian"):
            stmt = stmt.where(getattr(model, "kawasan_kajian") == area)
        if development_type and hasattr(model, "jenis_pembangunan"):
            stmt = stmt.where(getattr(model, "jenis_pembangunan") == development_type)
        if land_use and hasattr(model, "guna_tanah"):
            stmt = stmt.where(getattr(model, "guna_tanah") == land_use)
        return stmt
