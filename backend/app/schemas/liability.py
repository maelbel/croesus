from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.liability import LiabilityType


class LiabilityBase(BaseModel):
    name: str
    type: LiabilityType
    initial_amount: Decimal
    remaining_amount: Decimal
    monthly_payment: Decimal | None = None
    interest_rate: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None


class LiabilityCreate(LiabilityBase):
    pass


class LiabilityUpdate(BaseModel):
    name: str | None = None
    type: LiabilityType | None = None
    initial_amount: Decimal | None = None
    remaining_amount: Decimal | None = None
    monthly_payment: Decimal | None = None
    interest_rate: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None


class LiabilityRead(LiabilityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
