"""Converts amounts between currencies using free, keyless exchange rates from
Frankfurter (https://api.frankfurter.dev, ECB daily reference rates) — same
"no signup required" convention as app/services/pricing.py's Yahoo/CoinGecko
calls (see ROADMAP.md).

A local FxRateCache row per (base, quote) means a currency pair fetched
recently (within FX_RATE_CACHE_TTL_MINUTES) never re-hits the external API —
same purpose as pricing.py's PriceCache. A cache miss fetches rates from the
requested base to every SUPPORTED_CURRENCIES symbol in a single Frankfurter
call, not just the one pair asked for, so a second distinct currency needing
the same base is usually already warm.

Never raises: a failed fetch with no usable cached fallback is logged and
treated as a 1:1 rate (unconverted) rather than failing the caller (e.g. a
dashboard read shouldn't 500 just because Frankfurter is briefly down).
"""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.currency import SUPPORTED_CURRENCIES, Currency
from app.models.fx_rate_cache import FxRateCache

logger = logging.getLogger(__name__)

FRANKFURTER_LATEST_URL = "https://api.frankfurter.dev/v1/latest"


def _code(currency: str | Currency) -> str:
    """Plain 'EUR'-style code — a Currency enum member's str() is 'Currency.EUR',
    which would otherwise leak into cache keys and the Frankfurter query string."""
    return currency.value if isinstance(currency, Currency) else currency


def _fetch_rates_from(base: str) -> dict[str, Decimal]:
    symbols = [c for c in SUPPORTED_CURRENCIES if c != base]
    response = httpx.get(
        FRANKFURTER_LATEST_URL, params={"base": base, "symbols": ",".join(symbols)}, timeout=10
    )
    response.raise_for_status()
    return {quote: Decimal(str(rate)) for quote, rate in response.json()["rates"].items()}


def _cache_lookup(db: Session, base: str, quote: str, ttl_minutes: int, now: datetime) -> Decimal | None:
    entry = db.query(FxRateCache).filter(FxRateCache.base == base, FxRateCache.quote == quote).first()
    if entry is None or now - entry.fetched_at > timedelta(minutes=ttl_minutes):
        return None
    return entry.rate


def _cache_store(db: Session, base: str, quote: str, rate: Decimal, now: datetime) -> None:
    entry = db.query(FxRateCache).filter(FxRateCache.base == base, FxRateCache.quote == quote).first()
    if entry is not None:
        entry.rate = rate
        entry.fetched_at = now
    else:
        db.add(FxRateCache(base=base, quote=quote, rate=rate, fetched_at=now))


def get_rate(
    db: Session, from_currency: str | Currency, to_currency: str | Currency, ttl_minutes: int | None = None
) -> Decimal:
    """1 unit of from_currency, expressed in to_currency."""
    from_currency, to_currency = _code(from_currency), _code(to_currency)
    if from_currency == to_currency:
        return Decimal(1)

    ttl = ttl_minutes if ttl_minutes is not None else get_settings().fx_rate_cache_ttl_minutes
    now = datetime.now(UTC).replace(tzinfo=None)

    cached = _cache_lookup(db, from_currency, to_currency, ttl, now)
    if cached is not None:
        return cached

    try:
        rates = _fetch_rates_from(from_currency)
    except Exception:
        logger.warning("FX rate fetch failed for base %s", from_currency, exc_info=True)
        stale = db.query(FxRateCache).filter(
            FxRateCache.base == from_currency, FxRateCache.quote == to_currency
        ).first()
        return stale.rate if stale is not None else Decimal(1)

    for quote, rate in rates.items():
        _cache_store(db, from_currency, quote, rate, now)
    db.commit()

    return rates.get(to_currency, Decimal(1))


def convert(
    db: Session,
    amount: Decimal,
    from_currency: str | Currency,
    to_currency: str | Currency,
    ttl_minutes: int | None = None,
) -> Decimal:
    return amount * get_rate(db, from_currency, to_currency, ttl_minutes)


def get_rates_to(
    db: Session, target_currency: str | Currency, ttl_minutes: int | None = None
) -> dict[str, Decimal]:
    """For every other supported currency X: the rate such that
    amount_in_X * rate == amount_in_target_currency. Powers GET /fx-rates."""
    target_currency = _code(target_currency)
    return {
        currency: get_rate(db, currency, target_currency, ttl_minutes)
        for currency in SUPPORTED_CURRENCIES
        if currency != target_currency
    }
