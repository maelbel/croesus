"""add price tracking to assets

Revision ID: 369cc5b37d43
Revises: c35b77642512
Create Date: 2026-09-13 15:47:41.311453

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '369cc5b37d43'
down_revision: Union[str, Sequence[str], None] = 'c35b77642512'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('assets', sa.Column('current_price', sa.Numeric(precision=20, scale=8), nullable=True))
    op.add_column('assets', sa.Column('price_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('assets', 'price_updated_at')
    op.drop_column('assets', 'current_price')
