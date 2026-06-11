from argparse import ArgumentParser
from pathlib import Path

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.services.excel_importer import ExcelImporter


def main() -> None:
    parser = ArgumentParser(description="Import CCAP Excel workbook into PostgreSQL/PostGIS.")
    parser.add_argument("--file", type=Path, default=get_settings().source_excel_path)
    args = parser.parse_args()

    with SessionLocal() as db:
        batch = ExcelImporter(db).import_file(args.file)
    print(
        f"Import {batch.status}: rows={batch.total_rows}, "
        f"inserted={batch.inserted_rows}, updated={batch.updated_rows}, duplicates={batch.duplicate_rows}"
    )


if __name__ == "__main__":
    main()

