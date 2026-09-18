"""update default dashboard layout to catalog widgets

Revision ID: 49dec532a774
Revises: b20106b79865
Create Date: 2026-09-17 20:30:20.629183

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49dec532a774'
down_revision: Union[str, Sequence[str], None] = 'b20106b79865'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

dashboard_layouts = sa.table(
    'dashboard_layouts',
    sa.column('id', sa.Integer),
    sa.column('widgets', sa.JSON),
)

# The Croesus App v6 design's own DEFAULT_WIDGETS composition (8 kpi/line/donut/table/flow
# widgets), now that every one of those catalog kinds exists — replaces the previous default of
# 5 fixed-type widgets, which only existed because the catalog didn't yet.
NEW_WIDGETS = [
    {'id': 'statTile:net_worth', 'type': 'statTile', 'source': 'net_worth', 'x': 0, 'y': 0, 'w': 6, 'h': 1},
    {'id': 'statTile:total_debt', 'type': 'statTile', 'source': 'total_debt', 'x': 6, 'y': 0, 'w': 6, 'h': 1},
    {'id': 'statTile:envelopes_remaining', 'type': 'statTile', 'source': 'envelopes_remaining', 'x': 0, 'y': 1, 'w': 6, 'h': 1},
    {'id': 'statTile:emergency_fund', 'type': 'statTile', 'source': 'emergency_fund', 'x': 6, 'y': 1, 'w': 6, 'h': 1},
    {'id': 'trendChart:net_worth', 'type': 'trendChart', 'source': 'net_worth', 'x': 0, 'y': 2, 'w': 8, 'h': 3},
    {'id': 'breakdownDonut:assets_by_class', 'type': 'breakdownDonut', 'source': 'assets_by_class', 'x': 8, 'y': 2, 'w': 4, 'h': 3},
    {'id': 'list:accounts', 'type': 'list', 'source': 'accounts', 'x': 0, 'y': 5, 'w': 7, 'h': 3},
    {'id': 'payoffStatus:debt_payoff', 'type': 'payoffStatus', 'source': 'debt_payoff', 'x': 7, 'y': 5, 'w': 5, 'h': 3},
]

OLD_WIDGETS = [
    {'id': 'netWorthRings', 'type': 'netWorthRings', 'x': 0, 'y': 0, 'w': 12, 'h': 4},
    {'id': 'composition', 'type': 'composition', 'x': 0, 'y': 4, 'w': 12, 'h': 3},
    {'id': 'assetsByClass', 'type': 'assetsByClass', 'x': 0, 'y': 7, 'w': 12, 'h': 3},
    {'id': 'liabilitiesVsAssets', 'type': 'liabilitiesVsAssets', 'x': 0, 'y': 10, 'w': 12, 'h': 2},
    {'id': 'recentValuations', 'type': 'recentValuations', 'x': 0, 'y': 12, 'w': 12, 'h': 3},
]


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(dashboard_layouts.update().where(dashboard_layouts.c.id == 1).values(widgets=NEW_WIDGETS))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(dashboard_layouts.update().where(dashboard_layouts.c.id == 1).values(widgets=OLD_WIDGETS))
