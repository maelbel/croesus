"""make password_hash nullable for oidc-only accounts

Revision ID: c35b77642512
Revises: 8a1f2c9d4b3e
Create Date: 2026-08-26 09:39:15.268824

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c35b77642512'
down_revision: Union[str, Sequence[str], None] = '8a1f2c9d4b3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite has no native ALTER COLUMN — batch mode recreates the table
    # under the hood there, and issues a plain ALTER on Postgres/etc.
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash',
                   existing_type=sa.VARCHAR(length=255),
                   nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    null_count = bind.execute(sa.text("SELECT COUNT(*) FROM users WHERE password_hash IS NULL")).scalar()
    if null_count:
        raise RuntimeError(
            f"Cannot downgrade: {null_count} user(s) have a NULL password_hash "
            "(OIDC-only accounts, created after this migration's upgrade). "
            "Assign them a password_hash or delete those rows first — "
            "re-adding the NOT NULL constraint would otherwise fail against "
            "existing data."
        )
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash',
                   existing_type=sa.VARCHAR(length=255),
                   nullable=False)
