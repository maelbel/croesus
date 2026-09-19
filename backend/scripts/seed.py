"""Fill the database with realistic sample data for local/dev use.

Wipes existing accounts/assets/valuations/liabilities/envelopes/dashboard
layout and replaces them with a fixed, reproducible sample net worth (same
output every run). Never run this against a real/production database — it
deletes data.

Usage:
    uv run python scripts/seed.py --yes

Confirmation prompt lives in the `pnpm seed:dev` wrapper (scripts/seed-dev.mjs
at the repo root) — this script stays non-interactive so it also works
piped through `docker compose exec -T`.
"""

import random
import sys
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dateutil.relativedelta import relativedelta

from app.core.database import SessionLocal
from app.models.account import Account, AccountType
from app.models.asset import Asset, AssetClass
from app.models.currency import Currency
from app.models.dashboard_layout import DashboardLayout
from app.models.envelope import Envelope
from app.models.liability import Liability, LiabilityType
from app.models.valuation import Valuation

random.seed(42)

MIN_HISTORY_MONTHS = 12
MAX_HISTORY_MONTHS = 60
DAYS_PER_MONTH = 30.4368
RECENT_DAILY_DAYS = 45

# One of every widget type (legacy and catalog alike), sized within each kind's own resize bounds
# (frontend's WIDGET_SIZE_BOUNDS/WIDGET_CATALOG) and bound only to fixed sources — never an
# account/liability id, which this script doesn't know until the accounts below are flushed. Lets
# a fresh `pnpm seed:dev` board exercise every widget against real sample data immediately, instead
# of starting from the migration's smaller product-default layout and adding the rest by hand.
DASHBOARD_WIDGETS = [
    {"id": "statTile:net_worth", "type": "statTile", "source": "net_worth", "x": 0, "y": 0, "w": 4, "h": 1},
    {"id": "statTile:total_debt", "type": "statTile", "source": "total_debt", "x": 4, "y": 0, "w": 4, "h": 1},
    {"id": "statTile:emergency_fund", "type": "statTile", "source": "emergency_fund", "x": 8, "y": 0, "w": 4, "h": 1},
    {"id": "netWorthRings", "type": "netWorthRings", "x": 0, "y": 1, "w": 12, "h": 4},
    {"id": "composition", "type": "composition", "x": 0, "y": 5, "w": 12, "h": 3},
    {"id": "assetsByClass", "type": "assetsByClass", "x": 0, "y": 8, "w": 8, "h": 4},
    {"id": "liabilitiesVsAssets", "type": "liabilitiesVsAssets", "x": 8, "y": 8, "w": 4, "h": 4},
    {"id": "breakdownDonut:assets_by_class", "type": "breakdownDonut", "source": "assets_by_class", "x": 0, "y": 12, "w": 6, "h": 3},
    {"id": "payoffStatus:debt_payoff", "type": "payoffStatus", "source": "debt_payoff", "x": 6, "y": 12, "w": 6, "h": 3},
    {"id": "trendChart:net_worth", "type": "trendChart", "source": "net_worth", "x": 0, "y": 15, "w": 12, "h": 3},
    {"id": "recentValuations", "type": "recentValuations", "x": 0, "y": 18, "w": 12, "h": 4},
]


def months_since(start: date, today: date) -> int:
    return (today.year - start.year) * 12 + (today.month - start.month)


def valuation_series(
    history_start: date, today: date, start_value: Decimal, drift: float, noise: float
) -> list[tuple[date, Decimal]]:
    """A series of valuations from `history_start` to `today` following a smooth
    exponential trend with bounded noise wiggle around it: one point per month
    for the older history, then one point per day for the most recent
    `RECENT_DAILY_DAYS` days, so the chart's short-range tabs (1D/1W/1M) have
    real data instead of a single sparse monthly point.

    Noise is applied against the trend rather than compounded step-over-step,
    so a long history (several years) can't random-walk into runaway or
    near-zero values the way compounding per-step noise would. Daily noise is
    a fraction of monthly noise — day-to-day wiggle is smaller than the
    month-to-month re-appraisal swings the base `noise` models.
    """

    def trend(elapsed_days: int) -> float:
        return float(start_value) * (1 + drift) ** (elapsed_days / DAYS_PER_MONTH)

    out = []
    daily_start = today - timedelta(days=RECENT_DAILY_DAYS - 1)

    d = history_start
    while d < daily_start:
        value = trend((d - history_start).days) * (1 + random.uniform(-noise, noise))
        out.append((d, Decimal(str(round(value, 2)))))
        d = d + relativedelta(months=1)

    d = daily_start
    while d <= today:
        value = trend((d - history_start).days) * (1 + random.uniform(-noise * 0.3, noise * 0.3))
        out.append((d, Decimal(str(round(value, 2)))))
        d = d + timedelta(days=1)

    return out


def seed() -> None:
    db = SessionLocal()
    try:
        db.query(Valuation).delete()
        db.query(Asset).delete()
        db.query(Account).delete()
        db.query(Liability).delete()
        db.query(Envelope).delete()
        db.query(DashboardLayout).delete()

        today = datetime.now(UTC).date()
        now = datetime.now(UTC)

        accounts = [
            Account(
                name="Compte courant",
                type=AccountType.CHECKING,
                institution="BoursoBank",
                opened_at=date(2019, 1, 15),
            ),
            Account(
                name="Livret A",
                type=AccountType.REGULATED_SAVINGS,
                institution="Caisse d'Épargne",
                opened_at=date(2018, 3, 1),
                is_emergency_fund=True,
                emergency_fund_target=Decimal("10000.00"),
            ),
            Account(
                name="LDDS",
                type=AccountType.REGULATED_SAVINGS,
                institution="Caisse d'Épargne",
                opened_at=date(2019, 5, 1),
            ),
            Account(
                name="PEA",
                type=AccountType.PEA,
                institution="Trade Republic",
                opened_at=date(2020, 6, 1),
            ),
            Account(
                name="Assurance-vie",
                type=AccountType.LIFE_INSURANCE,
                institution="Linxea",
                opened_at=date(2017, 11, 20),
            ),
            Account(
                name="Compte-titres",
                type=AccountType.BROKERAGE,
                currency=Currency.USD,
                institution="Trade Republic",
                opened_at=date(2021, 2, 10),
            ),
            Account(
                name="Portefeuille crypto",
                type=AccountType.CRYPTO,
                institution="Kraken",
                opened_at=date(2021, 9, 5),
            ),
            Account(
                name="Résidence principale",
                type=AccountType.REAL_ESTATE,
                opened_at=date(2022, 7, 1),
                notes="Achat 2022, estimation via DVF locale",
            ),
            Account(
                name="SCPI Corum",
                type=AccountType.SCPI,
                institution="Corum",
                opened_at=date(2023, 1, 12),
            ),
            Account(
                name="Coffre-fort (or physique)",
                type=AccountType.OTHER,
                opened_at=date(2020, 11, 1),
                notes="Lingots détenus en coffre bancaire",
            ),
            Account(
                name="Compte épargne Londres",
                type=AccountType.OTHER,
                currency=Currency.GBP,
                institution="Monzo",
                opened_at=date(2022, 3, 15),
            ),
            Account(
                name="Compte épargne Zurich",
                type=AccountType.OTHER,
                currency=Currency.CHF,
                institution="UBS",
                opened_at=date(2023, 9, 1),
            ),
        ]
        db.add_all(accounts)
        db.flush()

        by_name = {a.name: a for a in accounts}

        # (account, starting value, monthly drift, monthly noise)
        valuation_plan = [
            (by_name["Compte courant"], Decimal(2200), 0.005, 0.15),
            (by_name["Livret A"], Decimal(8500), 0.0025, 0.01),
            (by_name["LDDS"], Decimal(6000), 0.003, 0.01),
            (by_name["PEA"], Decimal(14000), 0.012, 0.04),
            (by_name["Assurance-vie"], Decimal(22000), 0.006, 0.02),
            (by_name["Compte-titres"], Decimal(6000), 0.015, 0.06),
            (by_name["Portefeuille crypto"], Decimal(3000), 0.02, 0.18),
            (by_name["Résidence principale"], Decimal(310000), 0.002, 0.0),
            (by_name["SCPI Corum"], Decimal(9000), 0.004, 0.01),
            (by_name["Coffre-fort (or physique)"], Decimal(15000), 0.004, 0.02),
            (by_name["Compte épargne Londres"], Decimal(4000), 0.003, 0.02),
            (by_name["Compte épargne Zurich"], Decimal(5000), 0.002, 0.015),
        ]
        n_valuations = 0
        for account, start_value, drift, noise in valuation_plan:
            history_months = max(MIN_HISTORY_MONTHS, min(MAX_HISTORY_MONTHS, months_since(account.opened_at, today)))
            history_start = (today - relativedelta(months=history_months - 1)).replace(day=1)
            for d, value in valuation_series(history_start, today, start_value, drift, noise):
                db.add(Valuation(account_id=account.id, date=d, value=value))
                n_valuations += 1

        assets = [
            Asset(
                account_id=by_name["PEA"].id,
                name="Amundi MSCI World",
                symbol="CW8.PA",
                asset_class=AssetClass.ETF,
                quantity=Decimal("42.5"),
                unit_cost=Decimal("410.20"),
                current_price=Decimal("452.10"),
                price_updated_at=now,
            ),
            Asset(
                account_id=by_name["PEA"].id,
                name="BNP Paribas",
                symbol="BNP.PA",
                asset_class=AssetClass.STOCK,
                quantity=Decimal(15),
                unit_cost=Decimal("58.30"),
                current_price=Decimal("64.85"),
                price_updated_at=now,
            ),
            Asset(
                account_id=by_name["Compte-titres"].id,
                name="S&P 500 UCITS ETF",
                symbol="500.PA",
                asset_class=AssetClass.ETF,
                quantity=Decimal("8.2"),
                unit_cost=Decimal("520.00"),
                current_price=Decimal("560.40"),
                price_updated_at=now,
            ),
            Asset(
                account_id=by_name["Portefeuille crypto"].id,
                name="Bitcoin",
                symbol="BTC",
                asset_class=AssetClass.CRYPTO,
                quantity=Decimal("0.045"),
                unit_cost=Decimal("38000.00"),
                current_price=Decimal("58000.00"),
                price_updated_at=now,
            ),
            Asset(
                account_id=by_name["Portefeuille crypto"].id,
                name="Ethereum",
                symbol="ETH",
                asset_class=AssetClass.CRYPTO,
                quantity=Decimal("1.2"),
                unit_cost=Decimal("2400.00"),
                current_price=Decimal("3100.00"),
                price_updated_at=now,
            ),
            Asset(
                account_id=by_name["Assurance-vie"].id,
                name="Fonds Euro Sécurité",
                asset_class=AssetClass.FUND,
                quantity=Decimal("500.000"),
                unit_cost=Decimal("37.00"),
                current_price=Decimal("37.85"),
                price_updated_at=now,
            ),
            Asset(
                account_id=by_name["Coffre-fort (or physique)"].id,
                name="Lingots d'or (1kg)",
                asset_class=AssetClass.OTHER,
                quantity=Decimal(6),
                unit_cost=Decimal("2450.00"),
                current_price=Decimal("2600.00"),
                price_updated_at=now,
            ),
        ]
        db.add_all(assets)

        liabilities = [
            Liability(
                name="Crédit immobilier",
                type=LiabilityType.MORTGAGE,
                initial_amount=Decimal("280000.00"),
                remaining_amount=Decimal("241500.00"),
                monthly_payment=Decimal("1180.00"),
                interest_rate=Decimal("3.150"),
                start_date=date(2022, 7, 1),
                end_date=date(2047, 7, 1),
            ),
            Liability(
                name="Prêt auto",
                type=LiabilityType.CONSUMER_LOAN,
                currency=Currency.USD,
                initial_amount=Decimal("18000.00"),
                remaining_amount=Decimal("6400.00"),
                monthly_payment=Decimal("410.00"),
                interest_rate=Decimal("2.900"),
                start_date=date(2023, 4, 1),
                end_date=date(2027, 4, 1),
            ),
            Liability(
                name="Prêt personnel",
                type=LiabilityType.OTHER,
                initial_amount=Decimal("8000.00"),
                remaining_amount=Decimal("3200.00"),
                monthly_payment=Decimal("220.00"),
                interest_rate=Decimal("5.900"),
                start_date=date(2023, 6, 1),
                end_date=date(2026, 6, 1),
            ),
        ]
        db.add_all(liabilities)

        envelopes = [
            Envelope(
                name="Fonds d'urgence",
                target_amount=Decimal("10000.00"),
                current_amount=Decimal("8500.00"),
                color="#22c55e",
                icon="shield",
            ),
            Envelope(
                name="Vacances",
                target_amount=Decimal("3000.00"),
                current_amount=Decimal("1150.00"),
                color="#3b82f6",
                icon="plane",
            ),
            Envelope(
                name="Travaux maison",
                target_amount=Decimal("15000.00"),
                current_amount=Decimal("4200.00"),
                color="#f97316",
                icon="hammer",
            ),
            Envelope(
                name="Nouvelle voiture",
                target_amount=Decimal("20000.00"),
                current_amount=Decimal("0.00"),
                color="#a855f7",
                icon="car",
            ),
            Envelope(
                name="Cadeaux de Noël",
                target_amount=Decimal("500.00"),
                current_amount=Decimal("680.00"),
                color="#ef4444",
                icon="gift",
            ),
        ]
        db.add_all(envelopes)

        db.add(DashboardLayout(id=1, widgets=DASHBOARD_WIDGETS))

        db.commit()

        print(
            f"Seeded {len(accounts)} accounts, {n_valuations} valuations, "
            f"{len(assets)} assets, {len(liabilities)} liabilities, {len(envelopes)} envelopes, "
            f"{len(DASHBOARD_WIDGETS)} dashboard widgets."
        )
    finally:
        db.close()


if __name__ == "__main__":
    if "--yes" not in sys.argv:
        print("Refusing to run without --yes (this wipes existing data). Use `pnpm seed:dev` instead.")
        sys.exit(1)
    seed()
