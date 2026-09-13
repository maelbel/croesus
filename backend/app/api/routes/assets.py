from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.routes.crud_router import make_crud_router
from app.core.database import get_db
from app.models.account import Account
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate, PriceRefreshResult
from app.services.pricing import refresh_all_asset_prices


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


@router.post("/refresh-prices", response_model=PriceRefreshResult)
def refresh_prices(db: Session = Depends(get_db)):
    """Manual trigger alongside the automatic background refresh (see app/main.py)."""
    result = refresh_all_asset_prices(db)
    return PriceRefreshResult(
        updated=result.updated,
        failed=result.failed,
        skipped_no_symbol=result.skipped_no_symbol,
    )
