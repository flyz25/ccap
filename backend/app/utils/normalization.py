import re
import unicodedata
from decimal import Decimal, InvalidOperation
from typing import Any


SHEET_TO_DATASET = {
    "ECC SPK MAP": "ecc_spk_map",
    "ZONING MAP": "zoning_map",
    "OPTIMUM MAP": "optimum_map",
    "KETEPUAN": "ketepuan",
    "OVERALL POPULATION": "overall_population",
}

ALIASES = {
    "no": "source_no",
    "senario_1_guna_tanah_zoning_rt": "guna_tanah",
    "senario_guna_tanah_optimum": "guna_tanah",
    "normal_population_growth": "normal_population_growth",
    "injected_population_growth": "injected_population_growth",
    "ecc_semasa": "ecc_semasa",
}

INT_FIELDS = {"source_no", "tahun"}
NUMERIC_FIELDS = {
    "keluasan_kawasan_ha",
    "keluasan_kawasan_msq",
    "keluasan_kawasan_kajian_au",
    "kadar_akses",
    "pcc",
    "rcc",
    "ecc",
    "latitude",
    "longitude",
    "bil_penduduk",
    "bil_pengunjung",
    "normal_population_growth",
    "injected_population_growth",
    "ecc_semasa",
}


def slugify(value: Any) -> str:
    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[\(\)]", " ", text)
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text


def normalize_column_name(value: Any) -> str:
    name = slugify(value)
    for suffix in ("_zoning", "_optimum"):
        if name.endswith(suffix):
            name = name[: -len(suffix)]
    return ALIASES.get(name, name)


def normalize_sheet_name(sheet_name: str) -> str:
    return SHEET_TO_DATASET.get(sheet_name, slugify(sheet_name))


def clean_value(field: str, value: Any) -> Any:
    if value is None:
        return None

    try:
        import pandas as pd

        if pd.isna(value):
            return None
    except Exception:
        pass

    if field in INT_FIELDS:
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None

    if field in NUMERIC_FIELDS:
        try:
            text = str(value).strip().replace(",", "")
            if text == "":
                return None
            return Decimal(text)
        except (InvalidOperation, ValueError):
            return None

    text = str(value).strip()
    return text or None

