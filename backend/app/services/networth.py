from datetime import date
from decimal import Decimal

import pandas as pd
from sqlalchemy.orm import Session

from app.models.liability import Liability
from app.models.valuation import Valuation


def get_total_liabilities(db: Session) -> Decimal:
    total = db.query(Liability).with_entities(Liability.remaining_amount).all()
    return sum((row[0] for row in total), Decimal(0))


def get_current_net_worth(db: Session) -> dict:
    """Latest known valuation of each account, minus total liabilities."""
    latest_per_account = (
        db.query(Valuation)
        .order_by(Valuation.account_id, Valuation.date.desc(), Valuation.id.desc())
        .all()
    )
    seen: set[int] = set()
    total_assets = Decimal(0)
    for valuation in latest_per_account:
        if valuation.account_id in seen:
            continue
        seen.add(valuation.account_id)
        total_assets += valuation.value

    total_liabilities = get_total_liabilities(db)

    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
    }


def get_net_worth_history(db: Session) -> list[dict]:
    """
    Net worth over time, built from valuation history. Each account is
    forward-filled between two known valuations to reconstruct a continuous
    curve.

    v1 limitation: liabilities are treated as a constant (current remaining
    balance), since there's no liability history over time yet.
    """
    valuations = db.query(Valuation).all()
    if not valuations:
        return []

    df = pd.DataFrame(
        [
            {
                "date": v.date,
                "account_id": v.account_id,
                "value": float(v.value),
            }
            for v in valuations
        ]
    )

    pivot = df.pivot_table(
        index="date", columns="account_id", values="value", aggfunc="last"
    )
    pivot = pivot.sort_index().ffill()
    total_assets_by_date = pivot.sum(axis=1)

    total_liabilities = get_total_liabilities(db)

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
