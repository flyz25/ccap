from decimal import Decimal

from geoalchemy2 import Geometry
from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.models.base import AuditMixin, Base, IdMixin


class ImportTraceMixin:
    source_row: Mapped[int | None] = mapped_column(Integer)
    source_record_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    import_batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id", ondelete="SET NULL"))
    raw_data: Mapped[dict | None] = mapped_column(JSONB)


class SpatialPointMixin:
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(12, 8), index=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(12, 8), index=True)

    @declared_attr.directive
    def geom(cls):
        return mapped_column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True))


class CapacityMetricMixin:
    keluasan_kawasan_ha: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    keluasan_kawasan_msq: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    keluasan_kawasan_kajian_au: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    kadar_akses: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    pcc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), index=True)
    rcc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), index=True)
    ecc: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), index=True)
    bil_penduduk: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), index=True)
    bil_pengunjung: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))


class EccSpkMap(Base, IdMixin, AuditMixin, ImportTraceMixin, SpatialPointMixin, CapacityMetricMixin):
    __tablename__ = "ecc_spk_map"
    __table_args__ = (
        UniqueConstraint("source_record_hash", name="uq_ecc_spk_map_source_record_hash"),
        Index("ix_ecc_spk_map_area_land_use", "area", "guna_tanah"),
    )

    source_no: Mapped[int | None] = mapped_column(Integer)
    jenis_pembangunan: Mapped[str | None] = mapped_column(String(120), index=True)
    kawasan_kajian: Mapped[str | None] = mapped_column(String(180), index=True)
    area: Mapped[str | None] = mapped_column(String(180), index=True)
    ketinggian_tanah: Mapped[str | None] = mapped_column(String(120), index=True)
    guna_tanah: Mapped[str | None] = mapped_column(String(255), index=True)
    kesesuaian: Mapped[str | None] = mapped_column(String(255))


class ZoningMap(Base, IdMixin, AuditMixin, ImportTraceMixin, SpatialPointMixin, CapacityMetricMixin):
    __tablename__ = "zoning_map"
    __table_args__ = (
        UniqueConstraint("source_record_hash", name="uq_zoning_map_source_record_hash"),
        Index("ix_zoning_map_area_land_use", "area", "guna_tanah"),
    )

    source_no: Mapped[int | None] = mapped_column(Integer)
    kawasan_kajian: Mapped[str | None] = mapped_column(String(180), index=True)
    area: Mapped[str | None] = mapped_column(String(180), index=True)
    ketinggian_tanah: Mapped[str | None] = mapped_column(String(120), index=True)
    guna_tanah: Mapped[str | None] = mapped_column(String(255), index=True)


class OptimumMap(Base, IdMixin, AuditMixin, ImportTraceMixin, SpatialPointMixin, CapacityMetricMixin):
    __tablename__ = "optimum_map"
    __table_args__ = (
        UniqueConstraint("source_record_hash", name="uq_optimum_map_source_record_hash"),
        Index("ix_optimum_map_area_scenario", "area", "senario"),
    )

    source_no: Mapped[int | None] = mapped_column(Integer)
    kawasan_kajian: Mapped[str | None] = mapped_column(String(180), index=True)
    area: Mapped[str | None] = mapped_column(String(180), index=True)
    senario: Mapped[str | None] = mapped_column(String(255), index=True)
    ketinggian_tanah: Mapped[str | None] = mapped_column(String(120), index=True)
    guna_tanah: Mapped[str | None] = mapped_column(String(500), index=True)
    ecc_semasa: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))


class Ketepuan(Base, IdMixin, AuditMixin, ImportTraceMixin, SpatialPointMixin, CapacityMetricMixin):
    __tablename__ = "ketepuan"
    __table_args__ = (
        UniqueConstraint("source_record_hash", name="uq_ketepuan_source_record_hash"),
        Index("ix_ketepuan_land_use", "ketinggian_tanah", "guna_tanah"),
    )

    source_no: Mapped[int | None] = mapped_column(Integer)
    jenis_pembangunan: Mapped[str | None] = mapped_column(String(120), index=True)
    kawasan_kajian: Mapped[str | None] = mapped_column(String(180), index=True)
    ketinggian_tanah: Mapped[str | None] = mapped_column(String(120), index=True)
    guna_tanah: Mapped[str | None] = mapped_column(String(255), index=True)
    kesesuaian: Mapped[str | None] = mapped_column(String(255))


class OverallPopulation(Base, IdMixin, AuditMixin, ImportTraceMixin):
    __tablename__ = "overall_population"
    __table_args__ = (
        UniqueConstraint("source_record_hash", name="uq_overall_population_source_record_hash"),
        Index("ix_overall_population_year_area", "tahun", "kawasan_kajian"),
    )

    tahun: Mapped[int | None] = mapped_column(Integer, index=True)
    kawasan_kajian: Mapped[str | None] = mapped_column(String(180), index=True)
    normal_population_growth: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    injected_population_growth: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))

