from datetime import UTC, datetime
from decimal import Decimal

from app.models.account import Account, AccountType
from app.models.asset import Asset, AssetClass
from app.models.currency import Currency
from app.models.valuation import Valuation
from app.services import holdings_valuation


def _account(db) -> Account:
    account = Account(name="Brokerage", type=AccountType.BROKERAGE, currency=Currency.EUR)
    db.add(account)
    db.flush()
    return account


def _asset(db, account, symbol, current_price=None, quantity="1", unit_cost="10") -> Asset:
    asset = Asset(
        account_id=account.id,
        name=symbol or "Unnamed holding",
        symbol=symbol,
        asset_class=AssetClass.STOCK,
        quantity=Decimal(quantity),
        unit_cost=Decimal(unit_cost),
        current_price=Decimal(current_price) if current_price is not None else None,
    )
    db.add(asset)
    db.flush()
    return asset


def _synced_valuation(db, account_id) -> Valuation:
    holdings_valuation.sync_account_valuation_from_holdings(db, account_id)
    db.commit()
    return db.query(Valuation).filter(Valuation.account_id == account_id).one()


class TestSyncAccountValuationFromHoldings:
    def test_a_priced_symboled_asset_is_fully_priced(self, db_session):
        account = _account(db_session)
        _asset(db_session, account, "AAPL", current_price="150.00")
        db_session.commit()

        valuation = _synced_valuation(db_session, account.id)

        assert valuation.value == Decimal("150.00")
        assert valuation.fully_priced is True

    def test_a_symbol_free_asset_uses_cost_basis_and_stays_fully_priced(self, db_session):
        # No symbol means pricing.py never attempts to price it at all — that's expected,
        # intentional cost-basis behavior, not a pricing gap, so it must not flip fully_priced.
        account = _account(db_session)
        _asset(db_session, account, symbol=None, unit_cost="42.00")
        db_session.commit()

        valuation = _synced_valuation(db_session, account.id)

        assert valuation.value == Decimal("42.00")
        assert valuation.fully_priced is True

    def test_a_symboled_asset_never_successfully_priced_is_not_fully_priced(self, db_session):
        # Has a symbol (pricing.py is supposed to keep it priced) but current_price is still
        # None — e.g. added before the first refresh ran, or every refresh attempt has failed.
        account = _account(db_session)
        _asset(db_session, account, "BADSYM", current_price=None, unit_cost="42.00")
        db_session.commit()

        valuation = _synced_valuation(db_session, account.id)

        assert valuation.value == Decimal("42.00")
        assert valuation.fully_priced is False

    def test_one_unpriced_symboled_asset_taints_the_whole_account_total(self, db_session):
        account = _account(db_session)
        _asset(db_session, account, "AAPL", current_price="150.00")
        _asset(db_session, account, "BADSYM", current_price=None, unit_cost="42.00")
        db_session.commit()

        valuation = _synced_valuation(db_session, account.id)

        assert valuation.value == Decimal("192.00")
        assert valuation.fully_priced is False

    def test_a_failed_refresh_that_leaves_current_price_untouched_stays_unpriced(self, db_session):
        # Mirrors refresh_all_asset_prices: a failed fetch never writes current_price at all
        # (see test_pricing.py), so the fallback-to-cost-basis path is exactly what fires here.
        account = _account(db_session)
        asset = _asset(db_session, account, "AAPL", current_price="150.00")
        db_session.commit()
        asset.current_price = None  # simulates an asset that has never had a successful fetch
        db_session.commit()

        valuation = _synced_valuation(db_session, account.id)

        assert valuation.value == Decimal("10.00")  # falls back to unit_cost
        assert valuation.fully_priced is False

    def test_resyncing_an_existing_auto_valuation_updates_fully_priced(self, db_session):
        account = _account(db_session)
        asset = _asset(db_session, account, "AAPL", current_price=None, unit_cost="42.00")
        db_session.commit()
        valuation = _synced_valuation(db_session, account.id)
        assert valuation.fully_priced is False

        asset.current_price = Decimal("150.00")
        db_session.commit()
        valuation = _synced_valuation(db_session, account.id)

        assert valuation.value == Decimal("150.00")
        assert valuation.fully_priced is True

    def test_a_manual_valuation_for_today_is_left_untouched(self, db_session):
        account = _account(db_session)
        _asset(db_session, account, "BADSYM", current_price=None, unit_cost="42.00")
        today = datetime.now(UTC).date()
        db_session.add(Valuation(account_id=account.id, date=today, value=Decimal("999.00")))
        db_session.commit()

        holdings_valuation.sync_account_valuation_from_holdings(db_session, account.id)
        db_session.commit()

        valuation = db_session.query(Valuation).filter(Valuation.account_id == account.id).one()
        assert valuation.value == Decimal("999.00")
        assert valuation.fully_priced is True
