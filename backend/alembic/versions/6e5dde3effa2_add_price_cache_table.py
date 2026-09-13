"""add price cache table

Revision ID: 6e5dde3effa2
Revises: 369cc5b37d43
Create Date: 2026-09-13 16:53:07.741825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e5dde3effa2'
down_revision: Union[str, Sequence[str], None] = '369cc5b37d43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('price_cache',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('source', sa.String(length=20), nullable=False),
    sa.Column('symbol', sa.String(length=20), nullable=False),
    sa.Column('price', sa.Numeric(precision=20, scale=8), nullable=False),
    sa.Column('fetched_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('source', 'symbol', name='uq_price_cache_source_symbol')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('price_cache')
