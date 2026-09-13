"""Fetches current market prices for assets from free, keyless external APIs.

Stocks/ETFs/funds: Yahoo Finance's unofficial chart endpoint. Crypto:
CoinGecko's public simple-price endpoint. Both are used without an API key
by design (see ROADMAP.md) — no signup required to get this working, at the
cost of Yahoo's endpoint being unofficial/undocumented and CoinGecko only
covering the handful of coins in COINGECKO_IDS below.
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session

from app.models.asset import Asset, AssetClass

logger = logging.getLogger(__name__)

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
# A bare User-Agent isn't enough — Yahoo's unofficial endpoint 429s requests
# that don't otherwise look like they came from a browser tab on
# finance.yahoo.com (Accept/Referer/Origin included).
YAHOO_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com",
}

COINGECKO_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price"

# CoinGecko prices by coin id, not ticker symbol — this maps the common
# ones. Add more pairs here as needed; an unmapped symbol is skipped (see
# refresh_all_asset_prices) rather than failing the whole refresh.
COINGECKO_IDS: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
    "BNB": "binancecoin",
    "SOL": "solana",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "LTC": "litecoin",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "AVAX": "avalanche-2",
    "LINK": "chainlink",
    "ATOM": "cosmos",
    "XLM": "stellar",
    "TRX": "tron",
    "SHIB": "shiba-inu",
}


@dataclass
class PriceRefreshResult:
    updated: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    skipped_no_symbol: int = 0


def fetch_stock_price(client: httpx.Client, symbol: str) -> Decimal | None:
    response = client.get(YAHOO_CHART_URL.format(symbol=symbol), headers=YAHOO_HEADERS, timeout=10)
    response.raise_for_status()
    result = response.json()["chart"]["result"]
    if not result:
        return None
    price = result[0]["meta"].get("regularMarketPrice")
    return Decimal(str(price)) if price is not None else None


def fetch_crypto_prices(client: httpx.Client, symbols: list[str]) -> dict[str, Decimal]:
    ids_by_symbol = {s: COINGECKO_IDS[s] for s in symbols if s in COINGECKO_IDS}
    if not ids_by_symbol:
        return {}

    response = client.get(
        COINGECKO_PRICE_URL,
        params={"ids": ",".join(ids_by_symbol.values()), "vs_currencies": "usd"},
        timeout=10,
    )
    response.raise_for_status()
    body = response.json()

    prices: dict[str, Decimal] = {}
    for symbol, coin_id in ids_by_symbol.items():
        usd = body.get(coin_id, {}).get("usd")
        if usd is not None:
            prices[symbol] = Decimal(str(usd))
    return prices


def refresh_all_asset_prices(db: Session) -> PriceRefreshResult:
    """Wipes-and-refetches every priceable asset's current_price. Never raises —
    a single bad/unknown symbol is recorded in the result and skipped, not
    fatal to the rest of the batch."""
    result = PriceRefreshResult()
    assets = db.query(Asset).all()
    now = datetime.now(UTC).replace(tzinfo=None)

    with httpx.Client() as client:
        crypto_symbols = [a.symbol for a in assets if a.asset_class == AssetClass.CRYPTO and a.symbol]
        crypto_prices = fetch_crypto_prices(client, crypto_symbols)

        for asset in assets:
            if not asset.symbol:
                result.skipped_no_symbol += 1
                continue

            try:
                if asset.asset_class == AssetClass.CRYPTO:
                    price = crypto_prices.get(asset.symbol)
                    if price is None:
                        raise ValueError(f"no CoinGecko id mapped for symbol {asset.symbol!r}")
                else:
                    price = fetch_stock_price(client, asset.symbol)
                    if price is None:
                        raise ValueError(f"Yahoo Finance returned no price for symbol {asset.symbol!r}")
            except Exception:
                logger.warning("Price refresh failed for asset %s (%s)", asset.id, asset.symbol, exc_info=True)
                result.failed.append(asset.symbol)
                continue

            asset.current_price = price
            asset.price_updated_at = now
            result.updated.append(asset.symbol)

    db.commit()
    return result
