"""Keeps a liability's balance history in step with its own `remaining_amount` field —
see ROADMAP.md and issue #82. Runs after every liability create/update (see
app/api/routes/liabilities.py's after_write hook), so `remaining_amount` and its latest
LiabilityBalance entry never drift apart, the same way holdings_valuation.py keeps an
account's auto-valuation in step with its holdings.

Only ever touches a today's-dated LiabilityBalance this module itself created (tagged with
AUTO_BALANCE_NOTE) — a manual entry for today is left alone.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.liability import Liability
from app.models.liability_balance import LiabilityBalance

AUTO_BALANCE_NOTE = "Auto-recorded from liability update"


def sync_liability_balance(db: Session, liability: Liability) -> None:
    today = datetime.now(UTC).date()
    existing = (
        db.query(LiabilityBalance)
        .filter(LiabilityBalance.liability_id == liability.id, LiabilityBalance.date == today)
        .first()
    )
    # A today's-dated row we didn't create ourselves is a manual entry — never overwrite it.
    if existing is not None and existing.note != AUTO_BALANCE_NOTE:
        return

    if existing is not None:
        existing.remaining_amount = liability.remaining_amount
    else:
        db.add(
            LiabilityBalance(
                liability_id=liability.id,
                date=today,
                remaining_amount=liability.remaining_amount,
                note=AUTO_BALANCE_NOTE,
            )
        )
