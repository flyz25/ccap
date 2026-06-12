from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


ROUND_TO_INT = Decimal("1")
AREA_MULTIPLIER = Decimal("10000")


@dataclass(frozen=True)
class FormulaInput:
    area_ha: Decimal | None
    area_msq: Decimal | None
    au: Decimal | None
    rf: Decimal | None
    correction_factor: Decimal | None
    management_capability: Decimal | None


@dataclass(frozen=True)
class FormulaOutput:
    area_msq: Decimal | None
    pcc: Decimal | None
    rcc: Decimal | None
    ecc: Decimal | None


def as_decimal(value) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def round_half_up(value: Decimal) -> Decimal:
    return value.quantize(ROUND_TO_INT, rounding=ROUND_HALF_UP)


class CapacityFormulaService:
    def calculate(self, data: FormulaInput) -> FormulaOutput:
        area_msq = self.area_msq(data.area_ha, data.area_msq)
        pcc = self.pcc(area_msq, data.au, data.rf)
        rcc = self.rcc(pcc, data.correction_factor)
        ecc = self.ecc(rcc, data.management_capability)
        return FormulaOutput(area_msq=area_msq, pcc=pcc, rcc=rcc, ecc=ecc)

    def area_msq(self, area_ha: Decimal | None, stored_area_msq: Decimal | None = None) -> Decimal | None:
        if area_ha is not None:
            return area_ha * AREA_MULTIPLIER
        return stored_area_msq

    def pcc(self, area_msq: Decimal | None, au: Decimal | None, rf: Decimal | None) -> Decimal | None:
        if area_msq is None or au in (None, Decimal("0")) or rf is None:
            return None
        return round_half_up((area_msq / au) * rf)

    def rcc(self, pcc: Decimal | None, correction_factor: Decimal | None) -> Decimal | None:
        if pcc is None or correction_factor is None:
            return None
        return round_half_up(pcc * correction_factor)

    def ecc(self, rcc: Decimal | None, management_capability: Decimal | None) -> Decimal | None:
        if rcc is None or management_capability is None:
            return None
        return round_half_up(rcc * management_capability)
