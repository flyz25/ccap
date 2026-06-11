from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.auth import User
from app.schemas.common import ImportBatchRead
from app.services.dataset_service import DatasetService
from app.services.excel_importer import ExcelImporter


router = APIRouter(prefix="/upload", tags=["Data Upload"])


@router.post("/excel", response_model=ImportBatchRead)
def upload_excel(
    file: UploadFile = File(...),
    _: User = Depends(require_roles("Admin", "Planner", "Analyst")),
    db: Session = Depends(get_db),
) -> ImportBatchRead:
    suffix = Path(file.filename or "upload.xlsx").suffix or ".xlsx"
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        temp_path = tmp.name
    batch = ExcelImporter(db).import_file(temp_path)
    return ImportBatchRead.model_validate(batch)


@router.get("/history", response_model=list[ImportBatchRead])
def import_history(
    _: User = Depends(require_roles("Admin", "Planner", "Analyst", "Viewer")),
    db: Session = Depends(get_db),
) -> list[ImportBatchRead]:
    return [ImportBatchRead.model_validate(item) for item in DatasetService(db).import_history()]

