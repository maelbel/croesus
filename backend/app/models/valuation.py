from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.account import Account


class Valuation(Base):
    __tablename__ = "valuations"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    date: Mapped[date] = mapped_column(Date)
    value: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    note: Mapped[str | None] = mapped_column(String(500), default=None)
    # Only meaningful for an auto-calculated valuation (note == AUTO_VALUATION_NOTE, see
    # holdings_valuation.py): False means at least one symboled asset contributed cost basis
    # instead of a fetched market price, so `value` isn't a fully market-priced figure. Always
    # True for a manual entry — the user's own number, not something to second-guess.
    fully_priced: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    account: Mapped["Account"] = relationship(back_populates="valuations")
