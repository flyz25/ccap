from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.repositories.datasets import DatasetRepository
from app.services.dataset_service import DatasetService


class MapService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = DatasetRepository(db)
        self.dataset_service = DatasetService(db)

    def layers(self) -> list[dict[str, Any]]:
        return [
            {"id": "ecc_spk_map", "label": "ECC SPK Map", "type": "point", "enabled": True},
            {"id": "zoning_map", "label": "Zoning Map", "type": "point", "enabled": False},
            {"id": "optimum_map", "label": "Optimum Map", "type": "point", "enabled": False},
            {"id": "ketepuan", "label": "Ketepuan", "type": "point", "enabled": False},
        ]

    def points(self, dataset: str, limit: int = 2000) -> dict[str, Any]:
        model = self.repo.model_for(dataset)
        if not hasattr(model, "latitude") or not hasattr(model, "longitude"):
            return {"type": "FeatureCollection", "features": []}

        stmt = (
            select(model)
            .where(getattr(model, "latitude").is_not(None), getattr(model, "longitude").is_not(None))
            .limit(limit)
        )
        features = []
        for row in self.db.scalars(stmt):
            props = self.dataset_service.serialize_model(row)
            lat = props.pop("latitude", None)
            lon = props.pop("longitude", None)
            features.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": props,
                }
            )
        return {"type": "FeatureCollection", "features": features}

