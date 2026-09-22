from datetime import date as DateValue
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LiabilityBalanceBase(BaseModel):
    date: DateValue
    remaining_amount: Decimal = Field(ge=0)
    note: str | None = None


class LiabilityBalanceCreate(LiabilityBalanceBase):
    liability_id: int


class LiabilityBalanceUpdate(BaseModel):
    date: DateValue | None = None
    remaining_amount: Decimal | None = Field(default=None, ge=0)
    note: str | None = None


class LiabilityBalanceRead(LiabilityBalanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    liability_id: int
    created_at: datetime
