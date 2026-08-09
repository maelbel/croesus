from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ValuationBase(BaseModel):
    date: date
    value: Decimal
    note: str | None = None


class ValuationCreate(ValuationBase):
    account_id: int


class ValuationRead(ValuationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    created_at: datetime
