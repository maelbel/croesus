from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.routes.crud_router import make_crud_router
from app.models.liability import Liability
from app.models.liability_balance import LiabilityBalance
from app.schemas.liability_balance import (
    LiabilityBalanceCreate,
    LiabilityBalanceRead,
    LiabilityBalanceUpdate,
)


def _require_liability(db: Session, payload: LiabilityBalanceCreate) -> None:
    if db.get(Liability, payload.liability_id) is None:
        raise HTTPException(status_code=404, detail="Liability not found")


router = make_crud_router(
    prefix="/liability-balances",
    tag="liability-balances",
    model=LiabilityBalance,
    create_schema=LiabilityBalanceCreate,
    update_schema=LiabilityBalanceUpdate,
    read_schema=LiabilityBalanceRead,
    entity_name="Liability balance",
    order_by=LiabilityBalance.date,
    filter_column=LiabilityBalance.liability_id,
    filter_param_name="liability_id",
    validate_create=_require_liability,
)
