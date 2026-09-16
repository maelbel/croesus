from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.currency import Currency
from app.services import fx

router = APIRouter(prefix="/fx-rates", tags=["fx-rates"])


@router.get("")
def fx_rates(base: Currency | None = Query(None), db: Session = Depends(get_db)):
    base = base or get_settings().reference_currency
    return {
        "base": base,
        "rates": fx.get_rates_to(db, base),
        "as_of": datetime.now(UTC).replace(tzinfo=None).isoformat(),
    }
