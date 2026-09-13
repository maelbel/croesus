"""Derives an account's valuation automatically from its asset holdings —
see ROADMAP.md's "Automatic brokerage account valuation from positions +
prices". Runs after every asset write (app/api/routes/assets.py's
after_write hook) and after every price refresh (app/services/pricing.py),
so an account's value stays current whenever either its positions or their
prices change.

Accounts with no assets are left alone entirely — this only ever touches
today's valuation for an account that currently has at least one holding,
never invents one from nothing.
"""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.valuation import Valuation

AUTO_VALUATION_NOTE = "Auto-calculated from holdings"


def _holdings_value(db: Session, account_id: int) -> Decimal | None:
    assets = db.query(Asset).filter(Asset.account_id == account_id).all()
    if not assets:
        return None
    return sum(
        (asset.quantity * (asset.current_price if asset.current_price is not None else asset.unit_cost) for asset in assets),
        Decimal(0),
    )


def sync_account_valuation_from_holdings(db: Session, account_id: int) -> None:
    total = _holdings_value(db, account_id)
    if total is None:
        return

    today = datetime.now(UTC).date()
    existing = (
        db.query(Valuation)
        .filter(Valuation.account_id == account_id, Valuation.date == today)
        .first()
    )
    if existing is not None:
        existing.value = total
        existing.note = AUTO_VALUATION_NOTE
    else:
        db.add(Valuation(account_id=account_id, date=today, value=total, note=AUTO_VALUATION_NOTE))


def sync_all_account_valuations_from_holdings(db: Session) -> None:
    account_ids = [row[0] for row in db.query(Asset.account_id).distinct().all()]
    for account_id in account_ids:
        sync_account_valuation_from_holdings(db, account_id)
