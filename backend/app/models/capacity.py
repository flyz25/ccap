from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base, IdMixin


class CapacityMethodology(Base, IdMixin, AuditMixin):
    __tablename__ = "capacity_methodologies"
    __table_args__ = (UniqueConstraint("code", name="uq_capacity_methodologies_code"),)

    code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    formula_version: Mapped[str] = mapped_column(String(80), nullable=False)
    formula: Mapped[dict] = mapped_column(JSONB, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    factors: Mapped[list["CapacityFactor"]] = relationship(back_populates="methodology")
    runs: Mapped[list["CapacityCalculationRun"]] = relationship(back_populates="methodology")


class CapacityFactor(Base, IdMixin, AuditMixin):
    __tablename__ = "capacity_factors"
    __table_args__ = (
        UniqueConstraint("methodology_id", "dataset_scope", "area", name="uq_capacity_factors_scope_area"),
        Index("ix_capacity_factors_lookup", "methodology_id", "dataset_scope", "area", "is_active"),
    )

    methodology_id: Mapped[int] = mapped_column(ForeignKey("capacity_methodologies.id", ondelete="CASCADE"), nullable=False)
    dataset_scope: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    area: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    correction_factor: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    management_capability: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    methodology: Mapped[CapacityMethodology] = relationship(back_populates="factors")


class CapacityCalculationRun(Base, IdMixin, AuditMixin):
    __tablename__ = "capacity_calculation_runs"
    __table_args__ = (Index("ix_capacity_calculation_runs_started", "started_at"),)

    methodology_id: Mapped[int] = mapped_column(ForeignKey("capacity_methodologies.id", ondelete="RESTRICT"), nullable=False)
    import_batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    triggered_by: Mapped[str] = mapped_column(String(120), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warning_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_factor_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_input_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message: Mapped[str | None] = mapped_column(Text)

    methodology: Mapped[CapacityMethodology] = relationship(back_populates="runs")
    results: Mapped[list["CapacityCalculationResult"]] = relationship(back_populates="run")


class CapacityCalculationResult(Base, IdMixin, AuditMixin):
    __tablename__ = "capacity_calculation_results"
    __table_args__ = (
        UniqueConstraint("run_id", "dataset_scope", "source_id", name="uq_capacity_results_run_source"),
        Index("ix_capacity_results_run_status", "run_id", "status"),
        Index("ix_capacity_results_dataset_area", "dataset_scope", "record_area"),
    )

    run_id: Mapped[int] = mapped_column(ForeignKey("capacity_calculation_runs.id", ondelete="CASCADE"), nullable=False)
    methodology_id: Mapped[int] = mapped_column(ForeignKey("capacity_methodologies.id", ondelete="RESTRICT"), nullable=False)
    import_batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id", ondelete="SET NULL"))
    dataset_scope: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    source_table: Mapped[str] = mapped_column(String(80), nullable=False)
    source_id: Mapped[int] = mapped_column(Integer, nullable=False)
    source_row: Mapped[int | None] = mapped_column(Integer)
    source_record_hash: Mapped[str | None] = mapped_column(String(64))
    record_area: Mapped[str | None] = mapped_column(String(180), index=True)
    record_kawasan_kajian: Mapped[str | None] = mapped_column(String(180), index=True)

    stored_area_msq: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    stored_area_ha: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    stored_au: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    stored_rf: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    stored_pcc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    stored_rcc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    stored_ecc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))

    calculated_area_msq: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    calculated_pcc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    calculated_rcc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    calculated_ecc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    correction_factor: Mapped[Decimal | None] = mapped_column(Numeric(18, 8))
    management_capability: Mapped[Decimal | None] = mapped_column(Numeric(18, 8))

    pcc_delta: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    rcc_delta: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    ecc_delta: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    issue_code: Mapped[str | None] = mapped_column(String(80), index=True)
    details: Mapped[dict | None] = mapped_column(JSONB)

    run: Mapped[CapacityCalculationRun] = relationship(back_populates="results")
