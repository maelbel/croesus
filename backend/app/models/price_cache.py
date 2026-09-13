from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PriceCache(Base):
    """Last price fetched per (source, symbol) — see app/services/pricing.py.

    Lets a refresh skip the external API entirely for a symbol fetched
    recently (within PRICE_CACHE_TTL_MINUTES), whether that's because two
    assets share a symbol or because a manual refresh follows closely after
    the scheduled one.
    """

    __tablename__ = "price_cache"
    __table_args__ = (UniqueConstraint("source", "symbol", name="uq_price_cache_source_symbol"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(20))
    symbol: Mapped[str] = mapped_column(String(20))
    price: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
