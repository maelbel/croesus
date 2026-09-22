"""Derives an account's valuation automatically from its asset holdings —
see ROADMAP.md's "Automatic brokerage account valuation from positions +
prices". Runs after every asset write (app/api/routes/assets.py's
after_write hook) and after every price refresh (app/services/pricing.py),
so an account's value stays current whenever either its positions or their
prices change.

Only ever touches a today's-dated Valuation this module itself created
(tagged with AUTO_VALUATION_NOTE) — a manual entry for today is left
alone, and dropping an account to zero holdings retracts our own stale
auto-entry rather than leaving it in place.
"""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.valuation import Valuation

AUTO_VALUATION_NOTE = "Auto-calculated from holdings"


def _holdings_value(db: Session, account_id: int) -> tuple[Decimal, bool] | None:
    """Returns (total, fully_priced). fully_priced is False when a symboled asset (one
    pricing.py is supposed to keep priced) has no current_price yet — its cost basis fills in
    for the total, but that's not the same thing as a fetched market price, and callers need to
    be able to tell the difference. An asset with no symbol at all is expected to always
    contribute cost basis (see ROADMAP.md) and never counts against fully_priced."""
    assets = db.query(Asset).filter(Asset.account_id == account_id).all()
    if not assets:
        return None
    total = Decimal(0)
    fully_priced = True
    for asset in assets:
        if asset.current_price is not None:
            total += asset.quantity * asset.current_price
        else:
            total += asset.quantity * asset.unit_cost
            if asset.symbol:
                fully_priced = False
    return total, fully_priced


def sync_account_valuation_from_holdings(db: Session, account_id: int) -> None:
    today = datetime.now(UTC).date()
    existing = (
        db.query(Valuation)
        .filter(Valuation.account_id == account_id, Valuation.date == today)
        .first()
    )
    # A today's-dated row we didn't create ourselves is a manual entry —
    # never touch it, whether that's overwriting it with a new total or
    # deleting it because holdings dropped to zero.
    if existing is not None and existing.note != AUTO_VALUATION_NOTE:
        return

    holdings = _holdings_value(db, account_id)
    if holdings is None:
        if existing is not None:
            db.delete(existing)
        return
    total, fully_priced = holdings

    if existing is not None:
        existing.value = total
        existing.fully_priced = fully_priced
    else:
        db.add(
            Valuation(
                account_id=account_id,
                date=today,
                value=total,
                note=AUTO_VALUATION_NOTE,
                fully_priced=fully_priced,
            )
        )


def sync_all_account_valuations_from_holdings(db: Session) -> None:
    account_ids = [row[0] for row in db.query(Asset.account_id).distinct().all()]
    for account_id in account_ids:
        sync_account_valuation_from_holdings(db, account_id)
