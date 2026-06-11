from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import select, text
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import Session

from app.models import Base
from app.models.analytics import EccSpkMap, Ketepuan, OptimumMap, OverallPopulation, ZoningMap
from app.models.imports import ImportBatch
from app.utils.normalization import clean_value, normalize_column_name


SHEET_MODEL_MAP = {
    "ECC SPK MAP": EccSpkMap,
    "ZONING MAP": ZoningMap,
    "OPTIMUM MAP": OptimumMap,
    "KETEPUAN": Ketepuan,
    "OVERALL POPULATION": OverallPopulation,
}

SYSTEM_COLUMNS = {"id", "created_at", "updated_at", "geom"}


class ExcelImporter:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_schema(self) -> None:
        self.db.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        self.db.commit()
        Base.metadata.create_all(bind=self.db.get_bind())

    def import_file(self, path: str | Path) -> ImportBatch:
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Excel file not found: {file_path}")

        self.ensure_schema()
        started = datetime.now(timezone.utc)
        batch = ImportBatch(source_file=str(file_path), status="running", started_at=started, sheet_summaries={})
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)

        try:
            workbook = pd.read_excel(file_path, sheet_name=None, engine="openpyxl")
            summaries: dict[str, dict[str, int | str]] = {}
            total_inserted = total_updated = total_duplicates = total_rows = 0
            for sheet_name, frame in workbook.items():
                model = SHEET_MODEL_MAP.get(sheet_name)
                if model is None:
                    summaries[sheet_name] = {"status": "skipped", "rows": int(len(frame))}
                    continue
                summary = self._import_sheet(sheet_name, frame, model, batch.id)
                summaries[sheet_name] = summary
                total_rows += int(summary["rows"])
                total_inserted += int(summary["inserted"])
                total_updated += int(summary["updated"])
                total_duplicates += int(summary["duplicates"])

            batch.status = "completed"
            batch.finished_at = datetime.now(timezone.utc)
            batch.total_rows = total_rows
            batch.inserted_rows = total_inserted
            batch.updated_rows = total_updated
            batch.duplicate_rows = total_duplicates
            batch.sheet_summaries = summaries
            batch.message = "Excel import completed"
            self.db.add(batch)
            self.db.commit()
            self.db.refresh(batch)
            return batch
        except Exception as exc:
            self.db.rollback()
            batch.status = "failed"
            batch.finished_at = datetime.now(timezone.utc)
            batch.message = str(exc)
            self.db.add(batch)
            self.db.commit()
            self.db.refresh(batch)
            raise

    def _import_sheet(self, sheet_name: str, frame: pd.DataFrame, model: type, batch_id: int) -> dict[str, int | str]:
        frame = frame.dropna(how="all").copy()
        frame.columns = [normalize_column_name(column) for column in frame.columns]
        allowed_columns = {
            column.key
            for column in inspect(model).columns
            if column.key not in SYSTEM_COLUMNS and column.key != "source_record_hash"
        }

        inserted = updated = duplicates = 0
        seen_hashes: set[str] = set()
        for index, row in frame.iterrows():
            payload: dict[str, Any] = {}
            raw_data: dict[str, Any] = {}
            for column in frame.columns:
                value = clean_value(column, row[column])
                raw_data[column] = str(value) if value is not None else None
                if column in allowed_columns:
                    payload[column] = value

            record_hash = self._record_hash(sheet_name, raw_data)
            if record_hash in seen_hashes:
                duplicates += 1
                continue
            seen_hashes.add(record_hash)

            payload["source_record_hash"] = record_hash
            payload["source_row"] = int(index) + 2
            payload["import_batch_id"] = batch_id
            payload["raw_data"] = raw_data
            if "latitude" in payload and "longitude" in payload and payload["latitude"] and payload["longitude"]:
                payload["geom"] = from_shape(Point(float(payload["longitude"]), float(payload["latitude"])), srid=4326)

            existing = self.db.scalar(select(model).where(model.source_record_hash == record_hash))
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                self.db.add(existing)
                updated += 1
            else:
                self.db.add(model(**payload))
                inserted += 1

        self.db.commit()
        return {
            "status": "imported",
            "rows": int(len(frame)),
            "inserted": inserted,
            "updated": updated,
            "duplicates": duplicates,
        }

    def _record_hash(self, sheet_name: str, payload: dict[str, Any]) -> str:
        content = json.dumps({"sheet": sheet_name, "row": payload}, sort_keys=True, default=str)
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

