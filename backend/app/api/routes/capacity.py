from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.auth import User
from app.models.capacity import CapacityFactor
from app.schemas.capacity import (
    CapacityAuditResultRead,
    CapacityAuditPage,
    CapacityFactorRead,
    CapacityFactorUpdate,
    CapacityMethodologyRead,
    CapacityRecalculateRequest,
    CapacityRunRead,
    CapacityRunSummary,
)
from app.schemas.common import PageMeta
from app.services.capacity_audit import CapacityAuditService, CapacityFactorService


router = APIRouter(prefix="/capacity", tags=["Capacity Formula"])


@router.get("/methodology", response_model=CapacityMethodologyRead)
def methodology(
    _: User = Depends(require_roles("Admin", "Planner", "Analyst", "Viewer")),
    db: Session = Depends(get_db),
) -> CapacityMethodologyRead:
    return CapacityMethodologyRead.model_validate(CapacityFactorService(db).active_methodology())


@router.get("/factors", response_model=list[CapacityFactorRead])
def factors(
    dataset_scope: str | None = Query(default=None),
    area: str | None = Query(default=None),
    _: User = Depends(require_roles("Admin", "Planner", "Analyst", "Viewer")),
    db: Session = Depends(get_db),
) -> list[CapacityFactorRead]:
    methodology = CapacityFactorService(db).active_methodology()
    stmt = select(CapacityFactor).where(CapacityFactor.methodology_id == methodology.id)
    if dataset_scope:
        stmt = stmt.where(CapacityFactor.dataset_scope == CapacityAuditService(db).normalize_dataset(dataset_scope))
    if area:
        stmt = stmt.where(CapacityFactor.area == area)
    stmt = stmt.order_by(CapacityFactor.dataset_scope, CapacityFactor.area)
    return [CapacityFactorRead.model_validate(item) for item in db.scalars(stmt)]


@router.patch("/factors/{factor_id}", response_model=CapacityFactorRead)
def update_factor(
    factor_id: int,
    payload: CapacityFactorUpdate,
    _: User = Depends(require_roles("Admin", "Planner")),
    db: Session = Depends(get_db),
) -> CapacityFactorRead:
    factor = db.get(CapacityFactor, factor_id)
    if factor is None:
        raise HTTPException(status_code=404, detail="Capacity factor not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(factor, key, value)
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return CapacityFactorRead.model_validate(factor)


@router.post("/recalculate", response_model=CapacityRunRead)
def recalculate(
    payload: CapacityRecalculateRequest | None = None,
    user: User = Depends(require_roles("Admin", "Planner")),
    db: Session = Depends(get_db),
) -> CapacityRunRead:
    request = payload or CapacityRecalculateRequest()
    run = CapacityAuditService(db).run(
        import_batch_id=request.import_batch_id,
        dataset_scope=request.dataset_scope,
        triggered_by=user.username,
    )
    return CapacityRunRead.model_validate(run)


@router.get("/runs", response_model=list[CapacityRunRead])
def runs(
    limit: int = Query(default=20, ge=1, le=100),
    _: User = Depends(require_roles("Admin", "Planner", "Analyst", "Viewer")),
    db: Session = Depends(get_db),
) -> list[CapacityRunRead]:
    return [CapacityRunRead.model_validate(item) for item in CapacityAuditService(db).runs(limit=limit)]


@router.get("/runs/{run_id}/summary", response_model=CapacityRunSummary)
def run_summary(
    run_id: int,
    _: User = Depends(require_roles("Admin", "Planner", "Analyst", "Viewer")),
    db: Session = Depends(get_db),
) -> CapacityRunSummary:
    try:
        summary = CapacityAuditService(db).summary(run_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CapacityRunSummary(
        run=CapacityRunRead.model_validate(summary["run"]),
        by_dataset=summary["by_dataset"],
        by_area=summary["by_area"],
    )


@router.get("/audit", response_model=CapacityAuditPage)
def audit_results(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    run_id: int | None = Query(default=None),
    dataset_scope: str | None = Query(default=None),
    area: str | None = Query(default=None),
    status: str | None = Query(default=None),
    _: User = Depends(require_roles("Admin", "Planner", "Analyst", "Viewer")),
    db: Session = Depends(get_db),
) -> CapacityAuditPage:
    rows, total = CapacityAuditService(db).results(
        page=page,
        page_size=page_size,
        run_id=run_id,
        dataset_scope=dataset_scope,
        area=area,
        status=status,
    )
    return CapacityAuditPage(
        meta=PageMeta(page=page, page_size=page_size, total=total),
        items=[CapacityAuditResultRead.model_validate(item) for item in rows],
    )
