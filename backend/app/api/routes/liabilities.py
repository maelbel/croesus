from app.api.routes.crud_router import make_crud_router
from app.models.liability import Liability
from app.schemas.liability import LiabilityCreate, LiabilityRead, LiabilityUpdate

router = make_crud_router(
    prefix="/liabilities",
    tag="liabilities",
    model=Liability,
    create_schema=LiabilityCreate,
    update_schema=LiabilityUpdate,
    read_schema=LiabilityRead,
    entity_name="Liability",
    order_by=Liability.name,
)
