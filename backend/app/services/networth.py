from datetime import date
from decimal import Decimal

import pandas as pd
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models.liability import Liability
from app.models.valuation import Valuation
from app.services import fx


def get_total_liabilities(db: Session, reference_currency: str | None = None) -> Decimal:
    reference_currency = reference_currency or get_settings().reference_currency
    liabilities = db.query(Liability).all()
    return sum(
        (fx.convert(db, liability.remaining_amount, liability.currency, reference_currency) for liability in liabilities),
        Decimal(0),
    )


def get_current_net_worth(db: Session, reference_currency: str | None = None) -> dict:
    """Latest known valuation of each account, minus total liabilities. All
    values converted into reference_currency (default: settings.reference_currency)
    from each account's/liability's own currency, using the current spot FX rate."""
    reference_currency = reference_currency or get_settings().reference_currency

    latest_per_account = (
        db.query(Valuation)
        .options(joinedload(Valuation.account))
        .order_by(Valuation.account_id, Valuation.date.desc(), Valuation.id.desc())
        .all()
    )
    seen: set[int] = set()
    total_assets = Decimal(0)
    for valuation in latest_per_account:
        if valuation.account_id in seen:
            continue
        seen.add(valuation.account_id)
        total_assets += fx.convert(db, valuation.value, valuation.account.currency, reference_currency)

    total_liabilities = get_total_liabilities(db, reference_currency)

    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
    }


def get_net_worth_history(db: Session, reference_currency: str | None = None) -> list[dict]:
    """
    Net worth over time, built from valuation history. Each account is
    forward-filled between two known valuations to reconstruct a continuous
    curve. Each account's values are converted into reference_currency
    (default: settings.reference_currency) using the current spot FX rate,
    applied uniformly across the whole history — not the rate on each
    valuation's actual date.

    v1 limitation: liabilities are treated as a constant (current remaining
    balance), since there's no liability history over time yet.
    """
    reference_currency = reference_currency or get_settings().reference_currency

    # Same date+account_id can happen (manual entry + auto-sync same day) — order so
    # pivot_table's aggfunc="last" picks the highest id, matching get_current_net_worth's
    # explicit id-desc tiebreak instead of resolving non-deterministically.
    valuations = (
        db.query(Valuation)
        .options(joinedload(Valuation.account))
        .order_by(Valuation.account_id, Valuation.date, Valuation.id)
        .all()
    )
    if not valuations:
        return []

    df = pd.DataFrame(
        [
            {
                "date": v.date,
                "account_id": v.account_id,
                "value": float(fx.convert(db, v.value, v.account.currency, reference_currency)),
            }
            for v in valuations
        ]
    )

    pivot = df.pivot_table(
        index="date", columns="account_id", values="value", aggfunc="last"
    )
    pivot = pivot.sort_index().ffill()
    total_assets_by_date = pivot.sum(axis=1)

    total_liabilities = get_total_liabilities(db, reference_currency)

    history = []
    for d, assets in total_assets_by_date.items():
        total_assets = Decimal(str(round(assets, 2)))
        history.append(
            {
                "date": d.isoformat() if isinstance(d, date) else str(d),
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "net_worth": total_assets - total_liabilities,
            }
        )
    return history
