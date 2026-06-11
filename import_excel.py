from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.database import SessionLocal  # noqa: E402
from app.services.excel_importer import ExcelImporter  # noqa: E402


def main() -> None:
    source = ROOT / "CEKAL DATABASE - FINALIZED 11_7_2025.xlsx"
    with SessionLocal() as db:
        batch = ExcelImporter(db).import_file(source)
    print(
        f"Import {batch.status}: rows={batch.total_rows}, "
        f"inserted={batch.inserted_rows}, updated={batch.updated_rows}, duplicates={batch.duplicate_rows}"
    )


if __name__ == "__main__":
    main()

