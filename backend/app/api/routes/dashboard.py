from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.networth import get_current_net_worth, get_net_worth_history

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/net-worth")
def current_net_worth(db: Session = Depends(get_db)):
    return get_current_net_worth(db)


@router.get("/net-worth/history")
def net_worth_history(db: Session = Depends(get_db)):
    return get_net_worth_history(db)
