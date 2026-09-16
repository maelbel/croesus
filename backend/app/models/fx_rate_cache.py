from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FxRateCache(Base):
    """Last exchange rate fetched per (base, quote) — see app/services/fx.py.

    Lets a currency conversion skip the external API entirely for a pair
    fetched recently (within FX_RATE_CACHE_TTL_MINUTES) — same purpose and
    shape as PriceCache, for exchange rates instead of asset prices.
    """

    __tablename__ = "fx_rate_cache"
    __table_args__ = (UniqueConstraint("base", "quote", name="uq_fx_rate_cache_base_quote"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    base: Mapped[str] = mapped_column(String(3))
    quote: Mapped[str] = mapped_column(String(3))
    rate: Mapped[Decimal] = mapped_column(Numeric(20, 10))
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
