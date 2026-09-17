from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

WidgetType = Literal[
    "netWorthRings",
    "composition",
    "assetsByClass",
    "liabilitiesVsAssets",
    "recentValuations",
]


class Widget(BaseModel):
    id: str
    type: WidgetType
    x: int = Field(ge=0, le=11)
    y: int = Field(ge=0)
    w: int = Field(ge=1, le=12)
    h: int = Field(ge=1)


class DashboardLayoutRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    widgets: list[Widget]
    updated_at: datetime


class DashboardLayoutUpdate(BaseModel):
    widgets: list[Widget]
