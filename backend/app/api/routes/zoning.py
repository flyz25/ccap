from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.common import DatasetFilters, PaginatedResponse
from app.services.dataset_service import DatasetService


router = APIRouter(prefix="/zoning", tags=["Zoning"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse)
def list_zoning(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    area: str | None = Query(default=None),
    land_use: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    return DatasetService(db).list_dataset("zoning_map", page=page, page_size=page_size, area=area, land_use=land_use)


@router.get("/filters", response_model=DatasetFilters)
def filters(db: Session = Depends(get_db)) -> DatasetFilters:
    return DatasetService(db).filters("zoning_map")

