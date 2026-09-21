from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.models.account import Account, AccountType
from app.models.asset import Asset, AssetClass
from app.models.currency import Currency
from app.models.price_cache import PriceCache
from app.services import pricing


def _account(db) -> Account:
    account = Account(name="Brokerage", type=AccountType.BROKERAGE, currency=Currency.EUR)
    db.add(account)
    db.flush()
    return account


def _asset(db, account: Account, symbol: str | None, asset_class=AssetClass.STOCK, quantity="1", unit_cost="10") -> Asset:
    asset = Asset(
        account_id=account.id,
        name=symbol or "Unnamed holding",
        symbol=symbol,
        asset_class=asset_class,
        quantity=Decimal(quantity),
        unit_cost=Decimal(unit_cost),
    )
    db.add(asset)
    db.flush()
    return asset


def _unreachable(*_args, **_kwargs):
    raise ConnectionError("provider unreachable")


class TestRefreshAllAssetPrices:
    def test_a_failing_symbol_does_not_break_the_rest_of_the_batch(self, db_session, monkeypatch):
        account = _account(db_session)
        good = _asset(db_session, account, "AAPL")
        bad = _asset(db_session, account, "BADSYM")
        db_session.commit()

        def fake_fetch_stock_price(client, symbol):
            if symbol == "AAPL":
                return Decimal("150.00")
            raise ValueError(f"unknown symbol {symbol!r}")

        monkeypatch.setattr(pricing, "fetch_stock_price", fake_fetch_stock_price)

        result = pricing.refresh_all_asset_prices(db_session)

        assert result.updated == ["AAPL"]
        assert result.failed == ["BADSYM"]
        db_session.refresh(good)
        db_session.refresh(bad)
        assert good.current_price == Decimal("150.00")
        assert bad.current_price is None

    def test_a_failing_crypto_batch_does_not_break_stock_refresh(self, db_session, monkeypatch):
        account = _account(db_session)
        stock = _asset(db_session, account, "AAPL")
        _asset(db_session, account, "BTC", asset_class=AssetClass.CRYPTO, quantity="0.5")
        db_session.commit()

        monkeypatch.setattr(pricing, "fetch_stock_price", lambda client, symbol: Decimal("150.00"))
        monkeypatch.setattr(pricing, "fetch_crypto_prices", _unreachable)

        result = pricing.refresh_all_asset_prices(db_session)

        assert "AAPL" in result.updated
        assert "BTC" in result.failed
        db_session.refresh(stock)
        assert stock.current_price == Decimal("150.00")

    def test_an_unmapped_crypto_symbol_is_skipped_not_fatal(self, db_session):
        # No monkeypatching needed: fetch_crypto_prices itself short-circuits
        # to {} without any HTTP call when none of the requested symbols have
        # a COINGECKO_IDS mapping, so this exercises the real function safely.
        account = _account(db_session)
        _asset(db_session, account, "NOTACOIN", asset_class=AssetClass.CRYPTO)
        db_session.commit()

        result = pricing.refresh_all_asset_prices(db_session)

        assert result.failed == ["NOTACOIN"]

    def test_an_asset_without_a_symbol_is_counted_as_skipped(self, db_session, monkeypatch):
        account = _account(db_session)
        _asset(db_session, account, symbol=None)
        db_session.commit()
        monkeypatch.setattr(pricing, "fetch_stock_price", lambda client, symbol: Decimal(1))
        monkeypatch.setattr(pricing, "fetch_crypto_prices", lambda client, symbols: {})

        result = pricing.refresh_all_asset_prices(db_session)

        assert result.skipped_no_symbol == 1
        assert result.updated == []
        assert result.failed == []

    def test_fresh_price_cache_entry_is_used_without_hitting_the_external_api(self, db_session, monkeypatch):
        account = _account(db_session)
        asset = _asset(db_session, account, "AAPL")
        db_session.add(
            PriceCache(
                source=pricing.SOURCE_YAHOO,
                symbol="AAPL",
                price=Decimal("142.00"),
                fetched_at=datetime.now(UTC).replace(tzinfo=None),
            )
        )
        db_session.commit()
        monkeypatch.setattr(pricing, "fetch_stock_price", _unreachable)

        result = pricing.refresh_all_asset_prices(db_session, cache_ttl_minutes=60)

        assert result.updated == ["AAPL"]
        db_session.refresh(asset)
        assert asset.current_price == Decimal("142.00")

    def test_expired_price_cache_entry_triggers_a_refetch(self, db_session, monkeypatch):
        account = _account(db_session)
        asset = _asset(db_session, account, "AAPL")
        db_session.add(
            PriceCache(
                source=pricing.SOURCE_YAHOO,
                symbol="AAPL",
                price=Decimal("142.00"),
                fetched_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=90),
            )
        )
        db_session.commit()
        monkeypatch.setattr(pricing, "fetch_stock_price", lambda client, symbol: Decimal("160.00"))

        result = pricing.refresh_all_asset_prices(db_session, cache_ttl_minutes=60)

        assert result.updated == ["AAPL"]
        db_session.refresh(asset)
        assert asset.current_price == Decimal("160.00")

    def test_two_assets_sharing_a_symbol_only_trigger_one_external_call(self, db_session, monkeypatch):
        account = _account(db_session)
        _asset(db_session, account, "AAPL")
        _asset(db_session, account, "AAPL")
        db_session.commit()

        calls = []

        def counting_fetch(client, symbol):
            calls.append(symbol)
            return Decimal("150.00")

        monkeypatch.setattr(pricing, "fetch_stock_price", counting_fetch)

        result = pricing.refresh_all_asset_prices(db_session)

        assert calls == ["AAPL"]
        assert result.updated == ["AAPL", "AAPL"]
