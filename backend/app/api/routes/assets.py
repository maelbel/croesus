from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.routes.crud_router import make_crud_router
from app.models.account import Account
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate


def _require_account(db: Session, payload: AssetCreate) -> None:
    if db.get(Account, payload.account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")


router = make_crud_router(
    prefix="/assets",
    tag="assets",
    model=Asset,
    create_schema=AssetCreate,
    update_schema=AssetUpdate,
    read_schema=AssetRead,
    entity_name="Asset",
    order_by=Asset.name,
    filter_column=Asset.account_id,
    validate_create=_require_account,
)
