from app.api.routes.crud_router import make_crud_router
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountRead, AccountUpdate

router = make_crud_router(
    prefix="/accounts",
    tag="accounts",
    model=Account,
    create_schema=AccountCreate,
    update_schema=AccountUpdate,
    read_schema=AccountRead,
    entity_name="Account",
    order_by=Account.name,
    include_get_by_id=True,
)
