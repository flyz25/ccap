from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.capacity import CapacityFactor, CapacityMethodology


METHODOLOGY_CODE = "rw_cekal_2025_v1"
WILDCARD_AREA = "*"

FORMULA_DEFINITION = {
    "area_msq": "A_ha * 10000",
    "pcc": "ROUND((A_msq / Au) * Rf, 0)",
    "rcc": "ROUND(PCC * CF, 0)",
    "ecc": "ROUND(RCC * MC, 0)",
    "ecc_maksimum": "ECC Semasa + ECC Potensi + ECC Komited",
    "rounding": "ROUND_HALF_UP",
}

FACTOR_SEEDS = {
    "ecc_spk_map": {
        "Batang Padang": ("0.1428", "0.7519"),
        "Cameron Highland": ("0.1665", "0.6450"),
        "Kampar": ("0.1429", "0.6952"),
        "Kinta": ("0.1429", "0.7026"),
        "Lipis": ("0.1997", "0.4766"),
        "Lojing": ("0.1665", "0.4646"),
    },
    "zoning_map": {
        "Batang Padang": ("0.1666", "0.7519"),
        "Cameron Highland": ("0.2000", "0.6450"),
        "Kampar": ("0.1666", "0.6951"),
        "Kinta": ("0.1667", "0.7028"),
        "Lipis": ("0.2495", "0.4766"),
        "Lojing": ("0.1996", "0.4646"),
    },
    "optimum_map": {
        "Batang Padang": ("0.1428", "0.7521"),
        "Cameron Highland": ("0.1665", "0.6449"),
        "Kampar": ("0.1428", "0.6944"),
        "Kinta": ("0.1429", "0.7031"),
        "Lipis": ("0.1997", "0.4766"),
        "Lojing": ("0.1665", "0.4646"),
    },
    "ketepuan": {
        "Batang Padang": ("0.1428", "0.7519"),
        "Cameron Highland": ("0.1665", "0.6450"),
        "Kampar": ("0.1429", "0.6952"),
        "Kinta": ("0.1429", "0.7026"),
        "Lipis": ("0.1997", "0.4766"),
        "Lojing": ("0.1665", "0.4646"),
    },
}


class CapacitySeedService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_seed_data(self) -> CapacityMethodology:
        methodology = self.db.scalar(select(CapacityMethodology).where(CapacityMethodology.code == METHODOLOGY_CODE))
        if methodology is None:
            methodology = CapacityMethodology(
                code=METHODOLOGY_CODE,
                name="RW CEKAL 2025 Formula Engine v1",
                formula_version="v1",
                formula=FORMULA_DEFINITION,
                notes=(
                    "Formula disahkan melalui Jilid III RW CEKAL dan padanan workbook client. "
                    "Nilai CF/MC awal diinfer daripada workbook dan perlu disahkan client."
                ),
                is_active=True,
            )
            self.db.add(methodology)
            self.db.flush()
        elif not methodology.is_active:
            methodology.is_active = True
            self.db.add(methodology)

        for dataset_scope, factors in FACTOR_SEEDS.items():
            for area, (cf, mc) in factors.items():
                existing = self.db.scalar(
                    select(CapacityFactor).where(
                        CapacityFactor.methodology_id == methodology.id,
                        CapacityFactor.dataset_scope == dataset_scope,
                        CapacityFactor.area == area,
                    )
                )
                if existing is not None:
                    continue
                self.db.add(
                    CapacityFactor(
                        methodology_id=methodology.id,
                        dataset_scope=dataset_scope,
                        area=area,
                        correction_factor=Decimal(cf),
                        management_capability=Decimal(mc),
                        source="inferred_from_client_workbook",
                        notes="Median inferred from CEKAL DATABASE - FINALIZED 11_7_2025.xlsx.",
                        is_active=True,
                    )
                )
        self.db.commit()
        self.db.refresh(methodology)
        return methodology
