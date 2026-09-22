import enum
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.currency import Currency

if TYPE_CHECKING:
    from app.models.liability_balance import LiabilityBalance


class LiabilityType(str, enum.Enum):
    MORTGAGE = "mortgage"
    CONSUMER_LOAN = "consumer_loan"
    OTHER = "other"


class Liability(Base):
    __tablename__ = "liabilities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[LiabilityType] = mapped_column(Enum(LiabilityType))
    currency: Mapped[Currency] = mapped_column(Enum(Currency), default=Currency.EUR)
    initial_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    remaining_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    monthly_payment: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), default=None
    )
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 3), default=None)
    start_date: Mapped[date | None] = mapped_column(Date, default=None)
    end_date: Mapped[date | None] = mapped_column(Date, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    balances: Mapped[list["LiabilityBalance"]] = relationship(
        back_populates="liability", cascade="all, delete-orphan"
    )
