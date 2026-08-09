from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Envelope(Base):
    """YNAB-style budget allocation bucket — distinct from account type."""

    __tablename__ = "envelopes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), default=None)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    color: Mapped[str | None] = mapped_column(String(20), default=None)
    icon: Mapped[str | None] = mapped_column(String(50), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
