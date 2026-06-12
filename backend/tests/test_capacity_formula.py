from decimal import Decimal
import unittest

from app.services.capacity_formula import CapacityFormulaService, FormulaInput, round_half_up


class CapacityFormulaServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.service = CapacityFormulaService()

    def test_area_msq_uses_hectare_multiplier(self) -> None:
        self.assertEqual(self.service.area_msq(Decimal("4.5519")), Decimal("45519.0000"))

    def test_pcc_sample_hulu_telom(self) -> None:
        result = self.service.pcc(Decimal("45519"), Decimal("50"), Decimal("1"))
        self.assertEqual(result, Decimal("910"))

    def test_pcc_sample_institusi(self) -> None:
        result = self.service.pcc(Decimal("16657"), Decimal("30"), Decimal("2"))
        self.assertEqual(result, Decimal("1110"))

    def test_rcc_ecc_sample_with_cameron_factor(self) -> None:
        result = self.service.calculate(
            FormulaInput(
                area_ha=Decimal("4.5519"),
                area_msq=None,
                au=Decimal("50"),
                rf=Decimal("1"),
                correction_factor=Decimal("0.1665"),
                management_capability=Decimal("0.6450"),
            )
        )
        self.assertEqual(result.pcc, Decimal("910"))
        self.assertEqual(result.rcc, Decimal("152"))
        self.assertEqual(result.ecc, Decimal("98"))

    def test_rounding_is_half_up(self) -> None:
        self.assertEqual(round_half_up(Decimal("2.5")), Decimal("3"))


if __name__ == "__main__":
    unittest.main()
