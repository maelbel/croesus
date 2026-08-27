from app.api.routes.crud_router import make_crud_router
from app.models.envelope import Envelope
from app.schemas.envelope import EnvelopeCreate, EnvelopeRead, EnvelopeUpdate

router = make_crud_router(
    prefix="/envelopes",
    tag="envelopes",
    model=Envelope,
    create_schema=EnvelopeCreate,
    update_schema=EnvelopeUpdate,
    read_schema=EnvelopeRead,
    entity_name="Envelope",
    order_by=Envelope.name,
)
