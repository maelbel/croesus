from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class EnvelopeBase(BaseModel):
    name: str
    target_amount: Decimal | None = Field(default=None, ge=0)
    current_amount: Decimal = Field(default=Decimal(0), ge=0)
    color: str | None = None
    icon: str | None = None


class EnvelopeCreate(EnvelopeBase):
    pass


class EnvelopeUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = Field(default=None, ge=0)
    current_amount: Decimal | None = Field(default=None, ge=0)
    color: str | None = None
    icon: str | None = None


class EnvelopeRead(EnvelopeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
