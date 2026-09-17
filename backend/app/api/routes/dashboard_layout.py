from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.dashboard_layout import DashboardLayout
from app.schemas.dashboard_layout import DashboardLayoutRead, DashboardLayoutUpdate

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/layout", response_model=DashboardLayoutRead)
def get_layout(db: Session = Depends(get_db)):
    return db.query(DashboardLayout).filter(DashboardLayout.id == 1).one()


@router.patch("/layout", response_model=DashboardLayoutRead)
def update_layout(payload: DashboardLayoutUpdate, db: Session = Depends(get_db)):
    types = [w.type for w in payload.widgets]
    if len(types) != len(set(types)):
        raise HTTPException(status_code=422, detail="Duplicate widget type")
    layout = db.query(DashboardLayout).filter(DashboardLayout.id == 1).one()
    layout.widgets = [w.model_dump() for w in payload.widgets]
    db.flush()
    db.commit()
    db.refresh(layout)
    return layout
