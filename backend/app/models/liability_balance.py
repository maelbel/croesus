from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.liability import Liability


class LiabilityBalance(Base):
    """Point-in-time remaining balance for a liability — mirrors Valuation's role for
    accounts, so net worth history can reflect what was actually owed at each past date
    instead of projecting today's balance backward. See app/services/networth.py."""

    __tablename__ = "liability_balances"

    id: Mapped[int] = mapped_column(primary_key=True)
    liability_id: Mapped[int] = mapped_column(ForeignKey("liabilities.id"))
    date: Mapped[date] = mapped_column(Date)
    remaining_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    note: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    liability: Mapped["Liability"] = relationship(back_populates="balances")
