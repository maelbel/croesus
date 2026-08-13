from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.account import Account
from app.models.valuation import Valuation
from app.schemas.valuation import ValuationCreate, ValuationRead, ValuationUpdate

router = APIRouter(prefix="/valuations", tags=["valuations"])


@router.get("", response_model=list[ValuationRead])
def list_valuations(account_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Valuation)
    if account_id is not None:
        query = query.filter(Valuation.account_id == account_id)
    return query.order_by(Valuation.date).all()


@router.post("", response_model=ValuationRead, status_code=201)
def create_valuation(payload: ValuationCreate, db: Session = Depends(get_db)):
    if db.get(Account, payload.account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")
    valuation = Valuation(**payload.model_dump())
    db.add(valuation)
    db.commit()
    db.refresh(valuation)
    return valuation


@router.patch("/{valuation_id}", response_model=ValuationRead)
def update_valuation(
    valuation_id: int, payload: ValuationUpdate, db: Session = Depends(get_db)
):
    valuation = db.get(Valuation, valuation_id)
    if valuation is None:
        raise HTTPException(status_code=404, detail="Valuation not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(valuation, field, value)
    db.commit()
    db.refresh(valuation)
    return valuation


@router.delete("/{valuation_id}", status_code=204)
def delete_valuation(valuation_id: int, db: Session = Depends(get_db)):
    valuation = db.get(Valuation, valuation_id)
    if valuation is None:
        raise HTTPException(status_code=404, detail="Valuation not found")
    db.delete(valuation)
    db.commit()
