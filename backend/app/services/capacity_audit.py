from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, desc, func, select
from sqlalchemy.orm import Session

from app.models.analytics import EccSpkMap, Ketepuan, OptimumMap, ZoningMap
from app.models.capacity import (
    CapacityCalculationResult,
    CapacityCalculationRun,
    CapacityFactor,
    CapacityMethodology,
)
from app.services.capacity_formula import CapacityFormulaService, FormulaInput, as_decimal
from app.services.capacity_seed import METHODOLOGY_CODE, WILDCARD_AREA, CapacitySeedService


DATASET_MODELS = {
    "ecc_spk_map": EccSpkMap,
    "zoning_map": ZoningMap,
    "optimum_map": OptimumMap,
    "ketepuan": Ketepuan,
}

DATASET_ALIASES = {
    "ecc": "ecc_spk_map",
    "zoning": "zoning_map",
    "optimum": "optimum_map",
}


class CapacityFactorService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def active_methodology(self) -> CapacityMethodology:
        methodology = self.db.scalar(
            select(CapacityMethodology)
            .where(CapacityMethodology.code == METHODOLOGY_CODE, CapacityMethodology.is_active.is_(True))
            .order_by(CapacityMethodology.id.desc())
        )
        if methodology is None:
            methodology = CapacitySeedService(self.db).ensure_seed_data()
        return methodology

    def factor_for(
        self,
        methodology_id: int,
        dataset_scope: str,
        *,
        area: str | None,
        kawasan_kajian: str | None,
    ) -> CapacityFactor | None:
        candidates = [value for value in [area, kawasan_kajian, WILDCARD_AREA] if value]
        for candidate in candidates:
            factor = self.db.scalar(
                select(CapacityFactor).where(
                    CapacityFactor.methodology_id == methodology_id,
                    CapacityFactor.dataset_scope == dataset_scope,
                    CapacityFactor.area == candidate,
                    CapacityFactor.is_active.is_(True),
                )
            )
            if factor is not None:
                return factor
        return None


class CapacityAuditService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.formula = CapacityFormulaService()
        self.factors = CapacityFactorService(db)

    def run(
        self,
        *,
        import_batch_id: int | None = None,
        triggered_by: str = "manual",
        dataset_scope: str | None = None,
    ) -> CapacityCalculationRun:
        methodology = self.factors.active_methodology()
        started = datetime.now(timezone.utc)
        run = CapacityCalculationRun(
            methodology_id=methodology.id,
            import_batch_id=import_batch_id,
            status="running",
            triggered_by=triggered_by,
            started_at=started,
            total_rows=0,
            passed_rows=0,
            warning_rows=0,
            failed_rows=0,
            missing_factor_rows=0,
            missing_input_rows=0,
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        try:
            scopes = [self.normalize_dataset(dataset_scope)] if dataset_scope else list(DATASET_MODELS.keys())
            counts: Counter[str] = Counter()
            total = 0
            for scope in scopes:
                rows = self._rows_for_scope(scope, import_batch_id)
                for row in rows:
                    result = self._audit_row(run, methodology, scope, row)
                    counts[result.status] += 1
                    total += 1
                    self.db.add(result)

            run.status = "completed"
            run.finished_at = datetime.now(timezone.utc)
            run.total_rows = total
            run.passed_rows = counts["pass"]
            run.warning_rows = counts["warning"]
            run.failed_rows = counts["fail"]
            run.missing_factor_rows = counts["missing_factor"]
            run.missing_input_rows = counts["missing_input"]
            run.message = "Capacity audit completed"
            self.db.add(run)
            self.db.commit()
            self.db.refresh(run)
            return run
        except Exception as exc:
            self.db.rollback()
            run.status = "failed"
            run.finished_at = datetime.now(timezone.utc)
            run.message = str(exc)
            self.db.add(run)
            self.db.commit()
            self.db.refresh(run)
            raise

    def normalize_dataset(self, dataset_scope: str | None) -> str:
        if not dataset_scope:
            return "ecc_spk_map"
        normalized = DATASET_ALIASES.get(dataset_scope, dataset_scope)
        if normalized not in DATASET_MODELS:
            raise KeyError(f"Unknown capacity dataset '{dataset_scope}'")
        return normalized

    def latest_run(self) -> CapacityCalculationRun | None:
        return self.db.scalar(select(CapacityCalculationRun).order_by(desc(CapacityCalculationRun.started_at)))

    def runs(self, limit: int = 20) -> list[CapacityCalculationRun]:
        return list(self.db.scalars(select(CapacityCalculationRun).order_by(desc(CapacityCalculationRun.started_at)).limit(limit)))

    def results(
        self,
        *,
        page: int,
        page_size: int,
        run_id: int | None = None,
        dataset_scope: str | None = None,
        area: str | None = None,
        status: str | None = None,
    ) -> tuple[list[CapacityCalculationResult], int]:
        stmt = select(CapacityCalculationResult)
        stmt = self._apply_result_filters(stmt, run_id=run_id, dataset_scope=dataset_scope, area=area, status=status)
        total = int(self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
        rows = list(
            self.db.scalars(
                stmt.order_by(CapacityCalculationResult.id).offset((page - 1) * page_size).limit(page_size)
            )
        )
        return rows, total

    def summary(self, run_id: int) -> dict[str, Any]:
        run = self.db.get(CapacityCalculationRun, run_id)
        if run is None:
            raise KeyError(f"Run {run_id} not found")
        by_dataset = self.db.execute(
            select(
                CapacityCalculationResult.dataset_scope,
                CapacityCalculationResult.status,
                func.count(CapacityCalculationResult.id),
            )
            .where(CapacityCalculationResult.run_id == run_id)
            .group_by(CapacityCalculationResult.dataset_scope, CapacityCalculationResult.status)
            .order_by(CapacityCalculationResult.dataset_scope, CapacityCalculationResult.status)
        ).all()
        by_area = self.db.execute(
            select(
                CapacityCalculationResult.dataset_scope,
                CapacityCalculationResult.record_area,
                CapacityCalculationResult.status,
                func.count(CapacityCalculationResult.id),
            )
            .where(CapacityCalculationResult.run_id == run_id)
            .group_by(
                CapacityCalculationResult.dataset_scope,
                CapacityCalculationResult.record_area,
                CapacityCalculationResult.status,
            )
            .order_by(CapacityCalculationResult.dataset_scope, CapacityCalculationResult.record_area)
        ).all()
        return {
            "run": run,
            "by_dataset": [
                {"dataset_scope": row[0], "status": row[1], "count": int(row[2])}
                for row in by_dataset
            ],
            "by_area": [
                {"dataset_scope": row[0], "area": row[1], "status": row[2], "count": int(row[3])}
                for row in by_area
            ],
        }

    def _rows_for_scope(self, dataset_scope: str, import_batch_id: int | None) -> list[Any]:
        model = DATASET_MODELS[dataset_scope]
        stmt = select(model)
        if import_batch_id is not None:
            stmt = stmt.where(model.import_batch_id == import_batch_id)
        return list(self.db.scalars(stmt.order_by(model.id)))

    def _audit_row(
        self,
        run: CapacityCalculationRun,
        methodology: CapacityMethodology,
        dataset_scope: str,
        row: Any,
    ) -> CapacityCalculationResult:
        area = getattr(row, "area", None)
        kawasan_kajian = getattr(row, "kawasan_kajian", None)
        factor = self.factors.factor_for(methodology.id, dataset_scope, area=area, kawasan_kajian=kawasan_kajian)
        calculated = self.formula.calculate(
            FormulaInput(
                area_ha=as_decimal(getattr(row, "keluasan_kawasan_ha", None)),
                area_msq=as_decimal(getattr(row, "keluasan_kawasan_msq", None)),
                au=as_decimal(getattr(row, "keluasan_kawasan_kajian_au", None)),
                rf=as_decimal(getattr(row, "kadar_akses", None)),
                correction_factor=factor.correction_factor if factor else None,
                management_capability=factor.management_capability if factor else None,
            )
        )
        deltas = {
            "pcc": self._delta(getattr(row, "pcc", None), calculated.pcc),
            "rcc": self._delta(getattr(row, "rcc", None), calculated.rcc),
            "ecc": self._delta(getattr(row, "ecc", None), calculated.ecc),
        }
        status, issue_code = self._status(row, calculated, factor, deltas)
        return CapacityCalculationResult(
            run_id=run.id,
            methodology_id=methodology.id,
            import_batch_id=getattr(row, "import_batch_id", None),
            dataset_scope=dataset_scope,
            source_table=dataset_scope,
            source_id=row.id,
            source_row=getattr(row, "source_row", None),
            source_record_hash=getattr(row, "source_record_hash", None),
            record_area=area,
            record_kawasan_kajian=kawasan_kajian,
            stored_area_msq=getattr(row, "keluasan_kawasan_msq", None),
            stored_area_ha=getattr(row, "keluasan_kawasan_ha", None),
            stored_au=getattr(row, "keluasan_kawasan_kajian_au", None),
            stored_rf=getattr(row, "kadar_akses", None),
            stored_pcc=getattr(row, "pcc", None),
            stored_rcc=getattr(row, "rcc", None),
            stored_ecc=getattr(row, "ecc", None),
            calculated_area_msq=calculated.area_msq,
            calculated_pcc=calculated.pcc,
            calculated_rcc=calculated.rcc,
            calculated_ecc=calculated.ecc,
            correction_factor=factor.correction_factor if factor else None,
            management_capability=factor.management_capability if factor else None,
            pcc_delta=deltas["pcc"],
            rcc_delta=deltas["rcc"],
            ecc_delta=deltas["ecc"],
            status=status,
            issue_code=issue_code,
            details={
                "factor_area": factor.area if factor else None,
                "formula": methodology.formula,
            },
        )

    def _status(
        self,
        row: Any,
        calculated,
        factor: CapacityFactor | None,
        deltas: dict[str, Decimal | None],
    ) -> tuple[str, str | None]:
        if calculated.pcc is None:
            return "missing_input", "missing_pcc_input"
        if factor is None:
            return "missing_factor", "missing_cf_mc"
        comparable = [value for value in deltas.values() if value is not None]
        if not comparable:
            return "warning", "no_stored_values"
        max_delta = max(abs(value) for value in comparable)
        if max_delta == 0:
            return "pass", None
        if max_delta <= Decimal("1"):
            return "warning", "rounding_delta"
        return "fail", "value_mismatch"

    def _delta(self, stored, calculated: Decimal | None) -> Decimal | None:
        stored_decimal = as_decimal(stored)
        if stored_decimal is None or calculated is None:
            return None
        return stored_decimal - calculated

    def _apply_result_filters(
        self,
        stmt: Select,
        *,
        run_id: int | None,
        dataset_scope: str | None,
        area: str | None,
        status: str | None,
    ) -> Select:
        if run_id:
            stmt = stmt.where(CapacityCalculationResult.run_id == run_id)
        else:
            latest = self.latest_run()
            if latest is not None:
                stmt = stmt.where(CapacityCalculationResult.run_id == latest.id)
        if dataset_scope:
            stmt = stmt.where(CapacityCalculationResult.dataset_scope == self.normalize_dataset(dataset_scope))
        if area:
            stmt = stmt.where(
                (CapacityCalculationResult.record_area == area)
                | (CapacityCalculationResult.record_kawasan_kajian == area)
            )
        if status:
            stmt = stmt.where(CapacityCalculationResult.status == status)
        return stmt
