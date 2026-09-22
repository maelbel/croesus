import logging
from datetime import date
from decimal import Decimal

import pandas as pd
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models.liability import Liability
from app.models.liability_balance import LiabilityBalance
from app.models.valuation import Valuation
from app.services import fx

logger = logging.getLogger(__name__)


def get_total_liabilities(db: Session, reference_currency: str | None = None) -> tuple[Decimal, list[int]]:
    """Returns (total, unconverted_liability_ids). A liability whose currency has no available FX
    rate (see fx.FxRateUnavailableError) is excluded from the total — never fabricated as 1:1 —
    and its id is reported so the caller can surface that the total is partial."""
    reference_currency = reference_currency or get_settings().reference_currency
    liabilities = db.query(Liability).all()
    total = Decimal(0)
    unconverted: list[int] = []
    for liability in liabilities:
        try:
            total += fx.convert(db, liability.remaining_amount, liability.currency, reference_currency)
        except fx.FxRateUnavailableError:
            unconverted.append(liability.id)
    return total, unconverted


def get_current_net_worth(db: Session, reference_currency: str | None = None) -> dict:
    """Latest known valuation of each account, minus total liabilities. All
    values converted into reference_currency (default: settings.reference_currency)
    from each account's/liability's own currency, using the current spot FX rate.

    An account or liability whose currency has no available FX rate (see
    fx.FxRateUnavailableError) is excluded from the totals rather than fabricated as a 1:1
    conversion, and reported in unconverted_accounts/unconverted_liabilities so the caller knows
    the figures are partial rather than silently wrong."""
    reference_currency = reference_currency or get_settings().reference_currency

    latest_per_account = (
        db.query(Valuation)
        .options(joinedload(Valuation.account))
        .order_by(Valuation.account_id, Valuation.date.desc(), Valuation.id.desc())
        .all()
    )
    seen: set[int] = set()
    total_assets = Decimal(0)
    unconverted_accounts: list[int] = []
    for valuation in latest_per_account:
        if valuation.account_id in seen:
            continue
        seen.add(valuation.account_id)
        try:
            total_assets += fx.convert(db, valuation.value, valuation.account.currency, reference_currency)
        except fx.FxRateUnavailableError:
            unconverted_accounts.append(valuation.account_id)

    total_liabilities, unconverted_liabilities = get_total_liabilities(db, reference_currency)

    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
        "unconverted_accounts": unconverted_accounts,
        "unconverted_liabilities": unconverted_liabilities,
    }


def get_net_worth_history(db: Session, reference_currency: str | None = None) -> list[dict]:
    """
    Net worth over time, built from valuation history. Each account is
    forward-filled between two known valuations to reconstruct a continuous
    curve. Each account's values are converted into reference_currency
    (default: settings.reference_currency) using the current spot FX rate,
    applied uniformly across the whole history — not the rate on each
    valuation's actual date.

    Each liability contributes the balance it actually had on each historical date — forward-filled
    between its own recorded LiabilityBalance entries (see app/services/liability_balance.py), the
    same way an account is forward-filled between its own Valuation entries. A liability with no
    recorded balance history at all (never synced through the liabilities API, e.g. a row from
    before this existed) falls back to its current remaining_amount applied from its own start_date
    onward — the previous v1 flat-backward-projection, kept only as a last resort for liabilities we
    genuinely have no point-in-time data for. A liability with neither any recorded history nor a
    start_date falls back to applying from the earliest reported date onward instead of crashing on
    an unorderable comparison.

    v1 limitation: a valuation or liability whose currency has no available FX rate (see
    fx.FxRateUnavailableError) is dropped from the reconstruction entirely — excluded from every
    date's total, logged as a warning — rather than fabricated as a 1:1 conversion. This history
    endpoint returns a bare list (see GET /dashboard/net-worth/history), so unlike
    get_current_net_worth there is no per-point field reporting which ones were dropped; check the
    logs if a history curve looks lower than expected during an FX outage.
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

    rows = []
    for v in valuations:
        try:
            value = float(fx.convert(db, v.value, v.account.currency, reference_currency))
        except fx.FxRateUnavailableError:
            logger.warning(
                "Dropping valuation %s (account %s, %s) from net worth history: no FX rate available",
                v.id, v.account_id, v.account.currency,
            )
            continue
        rows.append({"date": v.date, "account_id": v.account_id, "value": value})

    if not rows:
        return []

    df = pd.DataFrame(rows)

    pivot = df.pivot_table(
        index="date", columns="account_id", values="value", aggfunc="last"
    )
    pivot = pivot.sort_index().ffill()
    total_assets_by_date = pivot.sum(axis=1)
    report_dates = pivot.index
    earliest_reported_date = report_dates.min()
    if not isinstance(earliest_reported_date, date):
        earliest_reported_date = pd.Timestamp(earliest_reported_date).date()

    # Real point-in-time entries first, grouped by liability.
    balances_by_liability: dict[int, list[tuple[date, Decimal]]] = {}
    for balance in (
        db.query(LiabilityBalance)
        .order_by(LiabilityBalance.liability_id, LiabilityBalance.date, LiabilityBalance.id)
        .all()
    ):
        balances_by_liability.setdefault(balance.liability_id, []).append((balance.date, balance.remaining_amount))

    liability_rows = []
    for liability in db.query(Liability).all():
        entries = balances_by_liability.get(liability.id)
        if not entries:
            # No recorded history for this one — fall back to the old flat approximation:
            # its current remaining_amount, applied from its own start_date onward (or from
            # the earliest reported date if start_date isn't set, rather than an unorderable
            # None <= date comparison).
            entries = [(liability.start_date or earliest_reported_date, liability.remaining_amount)]
        for entry_date, amount in entries:
            try:
                value = float(fx.convert(db, amount, liability.currency, reference_currency))
            except fx.FxRateUnavailableError:
                logger.warning(
                    "Dropping liability %s (%s) from net worth history: no FX rate available",
                    liability.id, liability.currency,
                )
                continue
            liability_rows.append({"date": entry_date, "liability_id": liability.id, "value": value})

    if liability_rows:
        ldf = pd.DataFrame(liability_rows)
        liability_pivot = ldf.pivot_table(index="date", columns="liability_id", values="value", aggfunc="last")
        # Union with report_dates before forward-filling, so a balance entry that falls between
        # two report dates (or before the first one) still gets picked up by ffill at the next
        # report date — then drop back down to exactly the dates being reported on.
        combined_index = liability_pivot.index.union(report_dates)
        liability_pivot = liability_pivot.reindex(combined_index).sort_index().ffill()
        total_liabilities_by_date = liability_pivot.reindex(report_dates).sum(axis=1)
    else:
        total_liabilities_by_date = pd.Series(0.0, index=report_dates)

    history = []
    for d in report_dates:
        history_date = d if isinstance(d, date) else pd.Timestamp(d).date()
        total_assets = Decimal(str(round(total_assets_by_date.loc[d], 2)))
        total_liabilities = Decimal(str(round(total_liabilities_by_date.loc[d], 2)))
        history.append(
            {
                "date": history_date.isoformat(),
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "net_worth": total_assets - total_liabilities,
            }
        )
    return history
