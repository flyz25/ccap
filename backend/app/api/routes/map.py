from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.map_service import MapService


router = APIRouter(prefix="/map", tags=["GIS Map"], dependencies=[Depends(get_current_user)])


@router.get("/layers")
def layers(db: Session = Depends(get_db)):
    return MapService(db).layers()


@router.get("/points")
def points(
    dataset: str = Query(default="ecc_spk_map"),
    limit: int = Query(default=2000, ge=1, le=10000),
    db: Session = Depends(get_db),
):
    return MapService(db).points(dataset, limit=limit)

