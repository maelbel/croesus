from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class EnvelopeBase(BaseModel):
    name: str
    target_amount: Decimal | None = None
    current_amount: Decimal = Decimal(0)
    color: str | None = None
    icon: str | None = None


class EnvelopeCreate(EnvelopeBase):
    pass


class EnvelopeUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = None
    current_amount: Decimal | None = None
    color: str | None = None
    icon: str | None = None


class EnvelopeRead(EnvelopeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
