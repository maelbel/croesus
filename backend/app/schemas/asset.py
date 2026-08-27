from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.asset import AssetClass


class AssetBase(BaseModel):
    name: str
    symbol: str | None = None
    asset_class: AssetClass
    quantity: Decimal = Field(ge=0)
    unit_cost: Decimal = Field(ge=0)


class AssetCreate(AssetBase):
    account_id: int


class AssetUpdate(BaseModel):
    name: str | None = None
    symbol: str | None = None
    asset_class: AssetClass | None = None
    quantity: Decimal | None = Field(default=None, ge=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)


class AssetRead(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    created_at: datetime
    updated_at: datetime
