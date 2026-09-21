from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.models.fx_rate_cache import FxRateCache
from app.services import fx


def _fresh(db, base: str, quote: str, rate: str, age: timedelta = timedelta(minutes=1)) -> FxRateCache:
    entry = FxRateCache(base=base, quote=quote, rate=Decimal(rate), fetched_at=datetime.now(UTC).replace(tzinfo=None) - age)
    db.add(entry)
    db.commit()
    return entry


def _unreachable(*_args, **_kwargs):
    raise ConnectionError("frankfurter unreachable")


class TestGetRate:
    def test_same_currency_is_always_one_without_touching_cache_or_network(self, db_session, monkeypatch):
        monkeypatch.setattr(fx, "_fetch_rates_from", _unreachable)

        assert fx.get_rate(db_session, "EUR", "EUR") == Decimal(1)

    def test_fresh_cache_entry_skips_the_external_fetch(self, db_session, monkeypatch):
        _fresh(db_session, "EUR", "USD", "1.10")
        monkeypatch.setattr(fx, "_fetch_rates_from", _unreachable)

        assert fx.get_rate(db_session, "EUR", "USD", ttl_minutes=720) == Decimal("1.10")

    def test_expired_cache_entry_triggers_a_refetch(self, db_session, monkeypatch):
        _fresh(db_session, "EUR", "USD", "1.10", age=timedelta(minutes=90))
        monkeypatch.setattr(fx, "_fetch_rates_from", lambda base: {"USD": Decimal("1.23")})

        assert fx.get_rate(db_session, "EUR", "USD", ttl_minutes=60) == Decimal("1.23")

    def test_cache_miss_fetches_and_stores_every_quote_from_one_call(self, db_session, monkeypatch):
        monkeypatch.setattr(
            fx, "_fetch_rates_from", lambda base: {"USD": Decimal("1.08"), "GBP": Decimal("0.85")}
        )

        rate = fx.get_rate(db_session, "EUR", "USD", ttl_minutes=720)

        assert rate == Decimal("1.08")
        cached_gbp = db_session.query(FxRateCache).filter_by(base="EUR", quote="GBP").first()
        assert cached_gbp is not None
        assert cached_gbp.rate == Decimal("0.85")

    def test_fetch_failure_without_any_cache_falls_back_to_1to1(self, db_session, monkeypatch):
        # Documents the current, undesirable fallback: a total provider outage
        # with nothing cached yet converts as if 1 EUR = 1 USD, silently.
        # Tracked for a real fix by issue #69.
        monkeypatch.setattr(fx, "_fetch_rates_from", _unreachable)

        assert fx.get_rate(db_session, "EUR", "USD", ttl_minutes=720) == Decimal(1)

    def test_fetch_failure_with_a_stale_cache_entry_returns_the_stale_rate_not_1to1(self, db_session, monkeypatch):
        _fresh(db_session, "EUR", "USD", "1.05", age=timedelta(days=30))
        monkeypatch.setattr(fx, "_fetch_rates_from", _unreachable)

        assert fx.get_rate(db_session, "EUR", "USD", ttl_minutes=720) == Decimal("1.05")


class TestConvert:
    def test_multiplies_amount_by_the_resolved_rate(self, db_session, monkeypatch):
        monkeypatch.setattr(fx, "get_rate", lambda *a, **k: Decimal(2))

        assert fx.convert(db_session, Decimal(50), "EUR", "USD") == Decimal(100)


class TestGetRatesTo:
    def test_returns_a_rate_for_every_other_supported_currency(self, db_session, monkeypatch):
        monkeypatch.setattr(fx, "get_rate", lambda db, currency, target, ttl_minutes=None: Decimal(3))

        rates = fx.get_rates_to(db_session, "EUR")

        assert "EUR" not in rates
        assert all(rate == Decimal(3) for rate in rates.values())
        assert len(rates) == len(fx.SUPPORTED_CURRENCIES) - 1
