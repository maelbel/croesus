from app.api.routes.crud_router import make_crud_router
from app.models.liability import Liability
from app.schemas.liability import LiabilityCreate, LiabilityRead, LiabilityUpdate
from app.services.liability_balance import sync_liability_balance


def _sync_balance(db, item: Liability, action: str) -> None:
    if action == "delete":
        return  # cascade="all, delete-orphan" on Liability.balances handles this
    sync_liability_balance(db, item)


router = make_crud_router(
    prefix="/liabilities",
    tag="liabilities",
    model=Liability,
    create_schema=LiabilityCreate,
    update_schema=LiabilityUpdate,
    read_schema=LiabilityRead,
    entity_name="Liability",
    order_by=Liability.name,
    after_write=_sync_balance,
)
