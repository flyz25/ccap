"""Initial CCAP schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-10
"""

from alembic import op
import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def audit_columns():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def trace_columns():
    return [
        sa.Column("source_row", sa.Integer()),
        sa.Column("source_record_hash", sa.String(length=64), nullable=False),
        sa.Column("import_batch_id", sa.Integer(), sa.ForeignKey("import_batches.id", ondelete="SET NULL")),
        sa.Column("raw_data", postgresql.JSONB()),
    ]


def spatial_columns():
    return [
        sa.Column("latitude", sa.Numeric(12, 8)),
        sa.Column("longitude", sa.Numeric(12, 8)),
        sa.Column("geom", geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=True)),
    ]


def capacity_columns():
    return [
        sa.Column("keluasan_kawasan_ha", sa.Numeric(18, 4)),
        sa.Column("keluasan_kawasan_msq", sa.Numeric(18, 4)),
        sa.Column("keluasan_kawasan_kajian_au", sa.Numeric(18, 4)),
        sa.Column("kadar_akses", sa.Numeric(18, 4)),
        sa.Column("pcc", sa.Numeric(18, 4)),
        sa.Column("rcc", sa.Numeric(18, 4)),
        sa.Column("ecc", sa.Numeric(18, 4)),
        sa.Column("bil_penduduk", sa.Numeric(18, 4)),
        sa.Column("bil_pengunjung", sa.Numeric(18, 4)),
    ]


def create_capacity_indexes(table: str) -> None:
    op.create_index(f"ix_{table}_id", table, ["id"])
    op.create_index(f"ix_{table}_latitude", table, ["latitude"])
    op.create_index(f"ix_{table}_longitude", table, ["longitude"])
    op.create_index(f"ix_{table}_pcc", table, ["pcc"])
    op.create_index(f"ix_{table}_rcc", table, ["rcc"])
    op.create_index(f"ix_{table}_ecc", table, ["ecc"])
    op.create_index(f"ix_{table}_bil_penduduk", table, ["bil_penduduk"])


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255)),
        *audit_columns(),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )
    op.create_index("ix_roles_id", "roles", ["id"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        *audit_columns(),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_file", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("message", sa.Text()),
        sa.Column("total_rows", sa.Integer(), nullable=False),
        sa.Column("inserted_rows", sa.Integer(), nullable=False),
        sa.Column("updated_rows", sa.Integer(), nullable=False),
        sa.Column("duplicate_rows", sa.Integer(), nullable=False),
        sa.Column("sheet_summaries", postgresql.JSONB()),
        *audit_columns(),
    )
    op.create_index("ix_import_batches_id", "import_batches", ["id"])

    op.create_table(
        "ecc_spk_map",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_no", sa.Integer()),
        sa.Column("jenis_pembangunan", sa.String(length=120)),
        sa.Column("kawasan_kajian", sa.String(length=180)),
        sa.Column("area", sa.String(length=180)),
        sa.Column("ketinggian_tanah", sa.String(length=120)),
        sa.Column("guna_tanah", sa.String(length=255)),
        sa.Column("kesesuaian", sa.String(length=255)),
        *trace_columns(),
        *spatial_columns(),
        *capacity_columns(),
        *audit_columns(),
        sa.UniqueConstraint("source_record_hash", name="uq_ecc_spk_map_source_record_hash"),
    )
    create_capacity_indexes("ecc_spk_map")
    op.create_index("ix_ecc_spk_map_jenis_pembangunan", "ecc_spk_map", ["jenis_pembangunan"])
    op.create_index("ix_ecc_spk_map_kawasan_kajian", "ecc_spk_map", ["kawasan_kajian"])
    op.create_index("ix_ecc_spk_map_area", "ecc_spk_map", ["area"])
    op.create_index("ix_ecc_spk_map_ketinggian_tanah", "ecc_spk_map", ["ketinggian_tanah"])
    op.create_index("ix_ecc_spk_map_guna_tanah", "ecc_spk_map", ["guna_tanah"])
    op.create_index("ix_ecc_spk_map_area_land_use", "ecc_spk_map", ["area", "guna_tanah"])

    op.create_table(
        "zoning_map",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_no", sa.Integer()),
        sa.Column("kawasan_kajian", sa.String(length=180)),
        sa.Column("area", sa.String(length=180)),
        sa.Column("ketinggian_tanah", sa.String(length=120)),
        sa.Column("guna_tanah", sa.String(length=255)),
        *trace_columns(),
        *spatial_columns(),
        *capacity_columns(),
        *audit_columns(),
        sa.UniqueConstraint("source_record_hash", name="uq_zoning_map_source_record_hash"),
    )
    create_capacity_indexes("zoning_map")
    op.create_index("ix_zoning_map_kawasan_kajian", "zoning_map", ["kawasan_kajian"])
    op.create_index("ix_zoning_map_area", "zoning_map", ["area"])
    op.create_index("ix_zoning_map_ketinggian_tanah", "zoning_map", ["ketinggian_tanah"])
    op.create_index("ix_zoning_map_guna_tanah", "zoning_map", ["guna_tanah"])
    op.create_index("ix_zoning_map_area_land_use", "zoning_map", ["area", "guna_tanah"])

    op.create_table(
        "optimum_map",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_no", sa.Integer()),
        sa.Column("kawasan_kajian", sa.String(length=180)),
        sa.Column("area", sa.String(length=180)),
        sa.Column("senario", sa.String(length=255)),
        sa.Column("ketinggian_tanah", sa.String(length=120)),
        sa.Column("guna_tanah", sa.String(length=500)),
        sa.Column("ecc_semasa", sa.Numeric(18, 4)),
        *trace_columns(),
        *spatial_columns(),
        *capacity_columns(),
        *audit_columns(),
        sa.UniqueConstraint("source_record_hash", name="uq_optimum_map_source_record_hash"),
    )
    create_capacity_indexes("optimum_map")
    op.create_index("ix_optimum_map_kawasan_kajian", "optimum_map", ["kawasan_kajian"])
    op.create_index("ix_optimum_map_area", "optimum_map", ["area"])
    op.create_index("ix_optimum_map_senario", "optimum_map", ["senario"])
    op.create_index("ix_optimum_map_ketinggian_tanah", "optimum_map", ["ketinggian_tanah"])
    op.create_index("ix_optimum_map_guna_tanah", "optimum_map", ["guna_tanah"])
    op.create_index("ix_optimum_map_area_scenario", "optimum_map", ["area", "senario"])

    op.create_table(
        "ketepuan",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_no", sa.Integer()),
        sa.Column("jenis_pembangunan", sa.String(length=120)),
        sa.Column("kawasan_kajian", sa.String(length=180)),
        sa.Column("ketinggian_tanah", sa.String(length=120)),
        sa.Column("guna_tanah", sa.String(length=255)),
        sa.Column("kesesuaian", sa.String(length=255)),
        *trace_columns(),
        *spatial_columns(),
        *capacity_columns(),
        *audit_columns(),
        sa.UniqueConstraint("source_record_hash", name="uq_ketepuan_source_record_hash"),
    )
    create_capacity_indexes("ketepuan")
    op.create_index("ix_ketepuan_jenis_pembangunan", "ketepuan", ["jenis_pembangunan"])
    op.create_index("ix_ketepuan_kawasan_kajian", "ketepuan", ["kawasan_kajian"])
    op.create_index("ix_ketepuan_ketinggian_tanah", "ketepuan", ["ketinggian_tanah"])
    op.create_index("ix_ketepuan_guna_tanah", "ketepuan", ["guna_tanah"])
    op.create_index("ix_ketepuan_land_use", "ketepuan", ["ketinggian_tanah", "guna_tanah"])

    op.create_table(
        "overall_population",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tahun", sa.Integer()),
        sa.Column("kawasan_kajian", sa.String(length=180)),
        sa.Column("normal_population_growth", sa.Numeric(18, 4)),
        sa.Column("injected_population_growth", sa.Numeric(18, 4)),
        *trace_columns(),
        *audit_columns(),
        sa.UniqueConstraint("source_record_hash", name="uq_overall_population_source_record_hash"),
    )
    op.create_index("ix_overall_population_id", "overall_population", ["id"])
    op.create_index("ix_overall_population_tahun", "overall_population", ["tahun"])
    op.create_index("ix_overall_population_kawasan_kajian", "overall_population", ["kawasan_kajian"])
    op.create_index("ix_overall_population_year_area", "overall_population", ["tahun", "kawasan_kajian"])


def downgrade() -> None:
    op.drop_table("overall_population")
    op.drop_table("ketepuan")
    op.drop_table("optimum_map")
    op.drop_table("zoning_map")
    op.drop_table("ecc_spk_map")
    op.drop_table("import_batches")
    op.drop_table("user_roles")
    op.drop_table("users")
    op.drop_table("roles")

