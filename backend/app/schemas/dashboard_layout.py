from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Legacy: one fixed data source each, at most one instance on the board.
LEGACY_WIDGET_TYPES = (
    "netWorthRings",
    "composition",
    "assetsByClass",
    "liabilitiesVsAssets",
    "recentValuations",
)
# Catalog: a `source` picks what the widget shows; multiple instances are
# allowed as long as no two share the same (type, source) pair.
CATALOG_WIDGET_TYPES = (
    "statTile",
    "trendChart",
    "breakdownDonut",
    "list",
    "payoffStatus",
)

WidgetType = Literal[
    "netWorthRings",
    "composition",
    "assetsByClass",
    "liabilitiesVsAssets",
    "recentValuations",
    "statTile",
    "trendChart",
    "breakdownDonut",
    "list",
    "payoffStatus",
]


class Widget(BaseModel):
    id: str
    type: WidgetType
    source: str | None = None
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
