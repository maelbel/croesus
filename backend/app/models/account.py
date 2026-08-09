import enum
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.valuation import Valuation


class AccountType(str, enum.Enum):
    CHECKING = "checking"
    REGULATED_SAVINGS = "regulated_savings"  # French regulated savings accounts (Livret A, LDDS, LEP...)
    PEA = "pea"  # French equity savings plan
    LIFE_INSURANCE = "life_insurance"  # French "assurance-vie" wrapper
    BROKERAGE = "brokerage"  # Standard brokerage account
    CRYPTO = "crypto"
    REAL_ESTATE = "real_estate"
    SCPI = "scpi"
    OTHER = "other"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[AccountType] = mapped_column(Enum(AccountType))
    institution: Mapped[str | None] = mapped_column(String(255), default=None)
    opened_at: Mapped[date | None] = mapped_column(Date, default=None)
    is_emergency_fund: Mapped[bool] = mapped_column(Boolean, default=False)
    emergency_fund_target: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), default=None
    )
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    valuations: Mapped[list["Valuation"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    assets: Mapped[list["Asset"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
