from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.routes.crud_router import make_crud_router
from app.models.account import Account
from app.models.valuation import Valuation
from app.schemas.valuation import ValuationCreate, ValuationRead, ValuationUpdate


def _require_account(db: Session, payload: ValuationCreate) -> None:
    if db.get(Account, payload.account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")


router = make_crud_router(
    prefix="/valuations",
    tag="valuations",
    model=Valuation,
    create_schema=ValuationCreate,
    update_schema=ValuationUpdate,
    read_schema=ValuationRead,
    entity_name="Valuation",
    order_by=Valuation.date,
    filter_column=Valuation.account_id,
    validate_create=_require_account,
)
