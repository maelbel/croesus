from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.account import AccountType


class AccountBase(BaseModel):
    name: str
    type: AccountType
    institution: str | None = None
    opened_at: date | None = None
    is_emergency_fund: bool = False
    emergency_fund_target: Decimal | None = None
    notes: str | None = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    institution: str | None = None
    opened_at: date | None = None
    is_emergency_fund: bool | None = None
    emergency_fund_target: Decimal | None = None
    notes: str | None = None


class AccountRead(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
