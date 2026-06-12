"""Add capacity formula audit engine tables.

Revision ID: 0002_capacity_formula_audit
Revises: 0001_initial_schema
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_capacity_formula_audit"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def audit_columns():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "capacity_methodologies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("formula_version", sa.String(length=80), nullable=False),
        sa.Column("formula", postgresql.JSONB(), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *audit_columns(),
        sa.UniqueConstraint("code", name="uq_capacity_methodologies_code"),
    )
    op.create_index("ix_capacity_methodologies_id", "capacity_methodologies", ["id"])
    op.create_index("ix_capacity_methodologies_code", "capacity_methodologies", ["code"])
    op.create_index("ix_capacity_methodologies_is_active", "capacity_methodologies", ["is_active"])

    op.create_table(
        "capacity_factors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("methodology_id", sa.Integer(), sa.ForeignKey("capacity_methodologies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_scope", sa.String(length=80), nullable=False),
        sa.Column("area", sa.String(length=180), nullable=False),
        sa.Column("correction_factor", sa.Numeric(18, 8), nullable=False),
        sa.Column("management_capability", sa.Numeric(18, 8), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *audit_columns(),
        sa.UniqueConstraint("methodology_id", "dataset_scope", "area", name="uq_capacity_factors_scope_area"),
    )
    op.create_index("ix_capacity_factors_id", "capacity_factors", ["id"])
    op.create_index("ix_capacity_factors_dataset_scope", "capacity_factors", ["dataset_scope"])
    op.create_index("ix_capacity_factors_area", "capacity_factors", ["area"])
    op.create_index("ix_capacity_factors_is_active", "capacity_factors", ["is_active"])
    op.create_index(
        "ix_capacity_factors_lookup",
        "capacity_factors",
        ["methodology_id", "dataset_scope", "area", "is_active"],
    )

    op.create_table(
        "capacity_calculation_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("methodology_id", sa.Integer(), sa.ForeignKey("capacity_methodologies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("import_batch_id", sa.Integer(), sa.ForeignKey("import_batches.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("triggered_by", sa.String(length=120), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("total_rows", sa.Integer(), nullable=False),
        sa.Column("passed_rows", sa.Integer(), nullable=False),
        sa.Column("warning_rows", sa.Integer(), nullable=False),
        sa.Column("failed_rows", sa.Integer(), nullable=False),
        sa.Column("missing_factor_rows", sa.Integer(), nullable=False),
        sa.Column("missing_input_rows", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text()),
        *audit_columns(),
    )
    op.create_index("ix_capacity_calculation_runs_id", "capacity_calculation_runs", ["id"])
    op.create_index("ix_capacity_calculation_runs_status", "capacity_calculation_runs", ["status"])
    op.create_index("ix_capacity_calculation_runs_started", "capacity_calculation_runs", ["started_at"])

    op.create_table(
        "capacity_calculation_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("capacity_calculation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("methodology_id", sa.Integer(), sa.ForeignKey("capacity_methodologies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("import_batch_id", sa.Integer(), sa.ForeignKey("import_batches.id", ondelete="SET NULL")),
        sa.Column("dataset_scope", sa.String(length=80), nullable=False),
        sa.Column("source_table", sa.String(length=80), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("source_row", sa.Integer()),
        sa.Column("source_record_hash", sa.String(length=64)),
        sa.Column("record_area", sa.String(length=180)),
        sa.Column("record_kawasan_kajian", sa.String(length=180)),
        sa.Column("stored_area_msq", sa.Numeric(18, 4)),
        sa.Column("stored_area_ha", sa.Numeric(18, 4)),
        sa.Column("stored_au", sa.Numeric(18, 4)),
        sa.Column("stored_rf", sa.Numeric(18, 4)),
        sa.Column("stored_pcc", sa.Numeric(18, 4)),
        sa.Column("stored_rcc", sa.Numeric(18, 4)),
        sa.Column("stored_ecc", sa.Numeric(18, 4)),
        sa.Column("calculated_area_msq", sa.Numeric(18, 4)),
        sa.Column("calculated_pcc", sa.Numeric(18, 4)),
        sa.Column("calculated_rcc", sa.Numeric(18, 4)),
        sa.Column("calculated_ecc", sa.Numeric(18, 4)),
        sa.Column("correction_factor", sa.Numeric(18, 8)),
        sa.Column("management_capability", sa.Numeric(18, 8)),
        sa.Column("pcc_delta", sa.Numeric(18, 4)),
        sa.Column("rcc_delta", sa.Numeric(18, 4)),
        sa.Column("ecc_delta", sa.Numeric(18, 4)),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("issue_code", sa.String(length=80)),
        sa.Column("details", postgresql.JSONB()),
        *audit_columns(),
        sa.UniqueConstraint("run_id", "dataset_scope", "source_id", name="uq_capacity_results_run_source"),
    )
    op.create_index("ix_capacity_calculation_results_id", "capacity_calculation_results", ["id"])
    op.create_index("ix_capacity_calculation_results_dataset_scope", "capacity_calculation_results", ["dataset_scope"])
    op.create_index("ix_capacity_calculation_results_record_area", "capacity_calculation_results", ["record_area"])
    op.create_index("ix_capacity_calculation_results_record_kawasan_kajian", "capacity_calculation_results", ["record_kawasan_kajian"])
    op.create_index("ix_capacity_calculation_results_status", "capacity_calculation_results", ["status"])
    op.create_index("ix_capacity_calculation_results_issue_code", "capacity_calculation_results", ["issue_code"])
    op.create_index("ix_capacity_results_run_status", "capacity_calculation_results", ["run_id", "status"])
    op.create_index("ix_capacity_results_dataset_area", "capacity_calculation_results", ["dataset_scope", "record_area"])


def downgrade() -> None:
    op.drop_table("capacity_calculation_results")
    op.drop_table("capacity_calculation_runs")
    op.drop_table("capacity_factors")
    op.drop_table("capacity_methodologies")
