from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.dashboard_layout import DashboardLayout
from app.schemas.dashboard_layout import (
    CATALOG_WIDGET_TYPES,
    DashboardLayoutRead,
    DashboardLayoutUpdate,
    Widget,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/layout", response_model=DashboardLayoutRead)
def get_layout(db: Session = Depends(get_db)):
    return db.query(DashboardLayout).filter(DashboardLayout.id == 1).one()


def _dedupe_key(widget: Widget) -> str:
    """Legacy types are unique by type alone; catalog types by (type, source) —
    multiple stat tiles are fine as long as they're bound to different sources."""
    if widget.type in CATALOG_WIDGET_TYPES:
        if not widget.source:
            raise HTTPException(status_code=422, detail=f"{widget.type} widget is missing a source")
        return f"{widget.type}:{widget.source}"
    return widget.type


@router.patch("/layout", response_model=DashboardLayoutRead)
def update_layout(payload: DashboardLayoutUpdate, db: Session = Depends(get_db)):
    keys = [_dedupe_key(w) for w in payload.widgets]
    if len(keys) != len(set(keys)):
        raise HTTPException(status_code=422, detail="Duplicate widget")
    layout = db.query(DashboardLayout).filter(DashboardLayout.id == 1).one()
    layout.widgets = [w.model_dump() for w in payload.widgets]
    db.flush()
    db.commit()
    db.refresh(layout)
    return layout
