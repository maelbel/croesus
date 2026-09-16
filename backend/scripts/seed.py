"""Fill the database with realistic sample data for local/dev use.

Wipes existing accounts/assets/valuations/liabilities/envelopes and replaces
them with a fixed, reproducible sample net worth (same output every run).
Never run this against a real/production database — it deletes data.

Usage:
    uv run python scripts/seed.py --yes

Confirmation prompt lives in the `pnpm seed:dev` wrapper (scripts/seed-dev.mjs
at the repo root) — this script stays non-interactive so it also works
piped through `docker compose exec -T`.
"""

import random
import sys
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dateutil.relativedelta import relativedelta

from app.core.database import SessionLocal
from app.models.account import Account, AccountType
from app.models.asset import Asset, AssetClass
from app.models.currency import Currency
from app.models.envelope import Envelope
from app.models.liability import Liability, LiabilityType
from app.models.valuation import Valuation

random.seed(42)


def monthly_valuations(start: date, months: int, start_value: Decimal, drift: float, noise: float) -> list[tuple[date, Decimal]]:
    """A `months`-long series of month-end valuations with a gentle up-trend."""
    out = []
    value = float(start_value)
    d = start
    for _ in range(months):
        value *= 1 + drift + random.uniform(-noise, noise)
        out.append((d, Decimal(str(round(value, 2)))))
        d = d + relativedelta(months=1)
    return out


def seed() -> None:
    db = SessionLocal()
    try:
        db.query(Valuation).delete()
        db.query(Asset).delete()
        db.query(Account).delete()
        db.query(Liability).delete()
        db.query(Envelope).delete()

        today = datetime.now(UTC).date()
        history_start = today - relativedelta(months=11)
        history_start = history_start.replace(day=1)

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
        ]
        db.add_all(accounts)
        db.flush()

        by_name = {a.name: a for a in accounts}

        # (account, starting value, monthly drift, monthly noise)
        valuation_plan = [
            (by_name["Compte courant"], Decimal(2200), 0.005, 0.15),
            (by_name["Livret A"], Decimal(8500), 0.0025, 0.01),
            (by_name["PEA"], Decimal(14000), 0.012, 0.04),
            (by_name["Assurance-vie"], Decimal(22000), 0.006, 0.02),
            (by_name["Compte-titres"], Decimal(6000), 0.015, 0.06),
            (by_name["Portefeuille crypto"], Decimal(3000), 0.02, 0.18),
            (by_name["Résidence principale"], Decimal(310000), 0.002, 0.0),
            (by_name["SCPI Corum"], Decimal(9000), 0.004, 0.01),
        ]
        for account, start_value, drift, noise in valuation_plan:
            for d, value in monthly_valuations(history_start, 12, start_value, drift, noise):
                db.add(Valuation(account_id=account.id, date=d, value=value))

        db.add_all(
            [
                Asset(
                    account_id=by_name["PEA"].id,
                    name="Amundi MSCI World",
                    symbol="CW8.PA",
                    asset_class=AssetClass.ETF,
                    quantity=Decimal("42.5"),
                    unit_cost=Decimal("410.20"),
                ),
                Asset(
                    account_id=by_name["PEA"].id,
                    name="BNP Paribas",
                    symbol="BNP.PA",
                    asset_class=AssetClass.STOCK,
                    quantity=Decimal(15),
                    unit_cost=Decimal("58.30"),
                ),
                Asset(
                    account_id=by_name["Compte-titres"].id,
                    name="S&P 500 UCITS ETF",
                    symbol="500.PA",
                    asset_class=AssetClass.ETF,
                    quantity=Decimal("8.2"),
                    unit_cost=Decimal("520.00"),
                ),
                Asset(
                    account_id=by_name["Portefeuille crypto"].id,
                    name="Bitcoin",
                    symbol="BTC",
                    asset_class=AssetClass.CRYPTO,
                    quantity=Decimal("0.045"),
                    unit_cost=Decimal("38000.00"),
                ),
                Asset(
                    account_id=by_name["Portefeuille crypto"].id,
                    name="Ethereum",
                    symbol="ETH",
                    asset_class=AssetClass.CRYPTO,
                    quantity=Decimal("1.2"),
                    unit_cost=Decimal("2400.00"),
                ),
            ]
        )

        db.add_all(
            [
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
                    initial_amount=Decimal("18000.00"),
                    remaining_amount=Decimal("6400.00"),
                    monthly_payment=Decimal("410.00"),
                    interest_rate=Decimal("2.900"),
                    start_date=date(2023, 4, 1),
                    end_date=date(2027, 4, 1),
                ),
            ]
        )

        db.add_all(
            [
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
            ]
        )

        db.commit()

        n_accounts = len(accounts)
        n_valuations = db.query(Valuation).count()
        print(
            f"Seeded {n_accounts} accounts, {n_valuations} valuations, "
            f"5 assets, 2 liabilities, 3 envelopes."
        )
    finally:
        db.close()


if __name__ == "__main__":
    if "--yes" not in sys.argv:
        print("Refusing to run without --yes (this wipes existing data). Use `pnpm seed:dev` instead.")
        sys.exit(1)
    seed()
