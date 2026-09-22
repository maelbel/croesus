from datetime import UTC, date, datetime
from decimal import Decimal

from app.models.currency import Currency
from app.models.liability import Liability, LiabilityType
from app.models.liability_balance import LiabilityBalance
from app.services import liability_balance


def _liability(db, remaining="1000.00", currency=Currency.EUR) -> Liability:
    liability = Liability(
        name="Loan",
        type=LiabilityType.CONSUMER_LOAN,
        currency=currency,
        initial_amount=Decimal(remaining),
        remaining_amount=Decimal(remaining),
    )
    db.add(liability)
    db.flush()
    return liability


class TestSyncLiabilityBalance:
    def test_creates_a_todays_entry_from_remaining_amount(self, db_session):
        item = _liability(db_session, "1000.00")
        db_session.commit()

        liability_balance.sync_liability_balance(db_session, item)
        db_session.commit()

        entry = db_session.query(LiabilityBalance).filter(LiabilityBalance.liability_id == item.id).one()
        assert entry.remaining_amount == Decimal("1000.00")
        assert entry.date == datetime.now(UTC).date()
        assert entry.note == liability_balance.AUTO_BALANCE_NOTE

    def test_resyncing_the_same_day_updates_the_existing_auto_entry_not_a_new_one(self, db_session):
        item = _liability(db_session, "1000.00")
        db_session.commit()
        liability_balance.sync_liability_balance(db_session, item)
        db_session.commit()

        item.remaining_amount = Decimal("900.00")
        liability_balance.sync_liability_balance(db_session, item)
        db_session.commit()

        entries = db_session.query(LiabilityBalance).filter(LiabilityBalance.liability_id == item.id).all()
        assert len(entries) == 1
        assert entries[0].remaining_amount == Decimal("900.00")

    def test_a_manual_entry_for_today_is_left_untouched(self, db_session):
        item = _liability(db_session, "1000.00")
        db_session.add(
            LiabilityBalance(
                liability_id=item.id,
                date=datetime.now(UTC).date(),
                remaining_amount=Decimal("500.00"),
            )
        )
        db_session.commit()

        liability_balance.sync_liability_balance(db_session, item)
        db_session.commit()

        entry = db_session.query(LiabilityBalance).filter(LiabilityBalance.liability_id == item.id).one()
        assert entry.remaining_amount == Decimal("500.00")

    def test_deleting_the_liability_cascades_to_its_balances(self, db_session):
        item = _liability(db_session, "1000.00")
        db_session.commit()
        liability_balance.sync_liability_balance(db_session, item)
        db_session.commit()

        db_session.delete(item)
        db_session.commit()

        assert db_session.query(LiabilityBalance).count() == 0

    def test_a_past_manual_entry_is_unaffected_by_a_later_sync(self, db_session):
        item = _liability(db_session, "1000.00")
        db_session.add(
            LiabilityBalance(liability_id=item.id, date=date(2020, 1, 1), remaining_amount=Decimal("1500.00"))
        )
        db_session.commit()

        liability_balance.sync_liability_balance(db_session, item)
        db_session.commit()

        entries = {e.date: e.remaining_amount for e in db_session.query(LiabilityBalance).all()}
        assert entries[date(2020, 1, 1)] == Decimal("1500.00")
        assert entries[datetime.now(UTC).date()] == Decimal("1000.00")
