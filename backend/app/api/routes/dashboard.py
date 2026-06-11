from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.dashboard import DashboardOverview
from app.services.dashboard_service import DashboardService


router = APIRouter(prefix="/dashboard", tags=["Executive Dashboard"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DashboardOverview)
def overview(
    area: str | None = Query(default=None),
    development_type: str | None = Query(default=None),
    land_use: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> DashboardOverview:
    return DashboardService(db).overview(area=area, development_type=development_type, land_use=land_use)

