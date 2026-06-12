from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import PageMeta


class CapacityMethodologyRead(BaseModel):
    id: int
    code: str
    name: str
    formula_version: str
    formula: dict[str, Any]
    notes: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class CapacityFactorRead(BaseModel):
    id: int
    methodology_id: int
    dataset_scope: str
    area: str
    correction_factor: Decimal
    management_capability: Decimal
    source: str
    notes: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class CapacityFactorUpdate(BaseModel):
    correction_factor: Decimal | None = Field(default=None, ge=0)
    management_capability: Decimal | None = Field(default=None, ge=0)
    source: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class CapacityRunRead(BaseModel):
    id: int
    methodology_id: int
    import_batch_id: int | None = None
    status: str
    triggered_by: str
    started_at: datetime
    finished_at: datetime | None = None
    total_rows: int
    passed_rows: int
    warning_rows: int
    failed_rows: int
    missing_factor_rows: int
    missing_input_rows: int
    message: str | None = None

    model_config = {"from_attributes": True}


class CapacityRecalculateRequest(BaseModel):
    dataset_scope: str | None = None
    import_batch_id: int | None = None


class CapacityAuditResultRead(BaseModel):
    id: int
    run_id: int
    dataset_scope: str
    source_table: str
    source_id: int
    source_row: int | None = None
    record_area: str | None = None
    record_kawasan_kajian: str | None = None
    stored_area_msq: Decimal | None = None
    stored_area_ha: Decimal | None = None
    stored_au: Decimal | None = None
    stored_rf: Decimal | None = None
    stored_pcc: Decimal | None = None
    stored_rcc: Decimal | None = None
    stored_ecc: Decimal | None = None
    calculated_area_msq: Decimal | None = None
    calculated_pcc: Decimal | None = None
    calculated_rcc: Decimal | None = None
    calculated_ecc: Decimal | None = None
    correction_factor: Decimal | None = None
    management_capability: Decimal | None = None
    pcc_delta: Decimal | None = None
    rcc_delta: Decimal | None = None
    ecc_delta: Decimal | None = None
    status: str
    issue_code: str | None = None
    details: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class CapacityAuditPage(BaseModel):
    meta: PageMeta
    items: list[CapacityAuditResultRead]


class CapacityRunSummary(BaseModel):
    run: CapacityRunRead
    by_dataset: list[dict[str, Any]]
    by_area: list[dict[str, Any]]
