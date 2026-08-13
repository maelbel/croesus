from datetime import date as DateValue
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ValuationBase(BaseModel):
    date: DateValue
    value: Decimal
    note: str | None = None


class ValuationCreate(ValuationBase):
    account_id: int


class ValuationUpdate(BaseModel):
    date: DateValue | None = None
    value: Decimal | None = None
    note: str | None = None


class ValuationRead(ValuationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    created_at: datetime
