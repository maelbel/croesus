from datetime import date
from decimal import Decimal

from app.models import (
    Account,
    AccountType,
    Currency,
    Liability,
    LiabilityType,
    Valuation,
)
from app.services import networth


def _account(db, name="Checking", currency=Currency.EUR, type_=AccountType.CHECKING) -> Account:
    account = Account(name=name, type=type_, currency=currency)
    db.add(account)
    db.flush()
    return account


def _valuation(db, account: Account, value: str, on_date: date) -> Valuation:
    valuation = Valuation(account_id=account.id, date=on_date, value=Decimal(value))
    db.add(valuation)
    db.flush()
    return valuation


def _liability(db, remaining: str, start_date: date, currency=Currency.EUR) -> Liability:
    liability = Liability(
        name="Loan",
        type=LiabilityType.CONSUMER_LOAN,
        currency=currency,
        initial_amount=Decimal(remaining),
        remaining_amount=Decimal(remaining),
        start_date=start_date,
    )
    db.add(liability)
    db.flush()
    return liability


class TestGetCurrentNetWorth:
    def test_uses_latest_valuation_per_account(self, db_session):
        account = _account(db_session)
        _valuation(db_session, account, "1000.00", date(2026, 1, 1))
        _valuation(db_session, account, "1200.00", date(2026, 2, 1))
        db_session.commit()

        result = networth.get_current_net_worth(db_session, reference_currency="EUR")

        assert result["total_assets"] == Decimal("1200.00")
        assert result["net_worth"] == Decimal("1200.00")

    def test_ties_on_same_date_break_on_highest_id(self, db_session):
        account = _account(db_session)
        _valuation(db_session, account, "100", date(2026, 1, 1))
        _valuation(db_session, account, "999", date(2026, 1, 1))
        db_session.commit()

        result = networth.get_current_net_worth(db_session, reference_currency="EUR")

        assert result["total_assets"] == Decimal(999)

    def test_sums_across_multiple_accounts(self, db_session):
        checking = _account(db_session, name="Checking")
        savings = _account(db_session, name="Savings")
        _valuation(db_session, checking, "1000", date(2026, 1, 1))
        _valuation(db_session, savings, "5000", date(2026, 1, 1))
        db_session.commit()

        result = networth.get_current_net_worth(db_session, reference_currency="EUR")

        assert result["total_assets"] == Decimal(6000)

    def test_subtracts_total_liabilities(self, db_session):
        account = _account(db_session)
        _valuation(db_session, account, "5000", date(2026, 1, 1))
        _liability(db_session, "1500", start_date=date(2020, 1, 1))
        db_session.commit()

        result = networth.get_current_net_worth(db_session, reference_currency="EUR")

        assert result["total_liabilities"] == Decimal(1500)
        assert result["net_worth"] == Decimal(3500)

    def test_converts_account_currency_to_reference_currency(self, db_session, monkeypatch):
        account = _account(db_session, currency=Currency.USD)
        _valuation(db_session, account, "100", date(2026, 1, 1))
        db_session.commit()
        monkeypatch.setattr(networth.fx, "get_rate", lambda *a, **k: Decimal("0.5"))

        result = networth.get_current_net_worth(db_session, reference_currency="EUR")

        assert result["total_assets"] == Decimal("50.0")

    def test_no_data_is_zero_net_worth(self, db_session):
        result = networth.get_current_net_worth(db_session, reference_currency="EUR")

        assert result == {
            "total_assets": Decimal(0),
            "total_liabilities": Decimal(0),
            "net_worth": Decimal(0),
        }


class TestGetNetWorthHistory:
    def test_empty_when_no_valuations(self, db_session):
        assert networth.get_net_worth_history(db_session, reference_currency="EUR") == []

    def test_forward_fills_gaps_across_accounts_with_different_valuation_dates(self, db_session):
        account_a = _account(db_session, name="A")
        account_b = _account(db_session, name="B")
        _valuation(db_session, account_a, "1000", date(2026, 1, 1))
        _valuation(db_session, account_a, "1200", date(2026, 3, 1))
        _valuation(db_session, account_b, "500", date(2026, 2, 1))
        db_session.commit()

        history = {h["date"]: h for h in networth.get_net_worth_history(db_session, reference_currency="EUR")}

        # Feb 1: B has just been valued (500); A has no valuation yet on this
        # date, so its Jan 1 value (1000) is forward-filled rather than
        # dropping A from the total.
        assert history["2026-01-01"]["total_assets"] == Decimal("1000.00")
        assert history["2026-02-01"]["total_assets"] == Decimal("1500.00")
        assert history["2026-03-01"]["total_assets"] == Decimal("1700.00")

    def test_liability_only_applies_from_its_start_date_onward(self, db_session):
        account = _account(db_session)
        _valuation(db_session, account, "1000", date(2026, 1, 1))
        _valuation(db_session, account, "1000", date(2026, 6, 1))
        _liability(db_session, "300", start_date=date(2026, 3, 1))
        db_session.commit()

        history = {h["date"]: h for h in networth.get_net_worth_history(db_session, reference_currency="EUR")}

        assert history["2026-01-01"]["total_liabilities"] == Decimal(0)
        assert history["2026-01-01"]["net_worth"] == Decimal("1000.00")
        assert history["2026-06-01"]["total_liabilities"] == Decimal(300)
        assert history["2026-06-01"]["net_worth"] == Decimal("700.00")

    def test_converts_each_valuation_using_its_own_account_currency(self, db_session, monkeypatch):
        account = _account(db_session, currency=Currency.USD)
        _valuation(db_session, account, "100", date(2026, 1, 1))
        db_session.commit()
        monkeypatch.setattr(networth.fx, "get_rate", lambda *a, **k: Decimal("0.5"))

        history = networth.get_net_worth_history(db_session, reference_currency="EUR")

        assert history[0]["total_assets"] == Decimal("50.00")
