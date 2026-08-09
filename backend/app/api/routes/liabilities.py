from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.liability import Liability
from app.schemas.liability import LiabilityCreate, LiabilityRead, LiabilityUpdate

router = APIRouter(prefix="/liabilities", tags=["liabilities"])


@router.get("", response_model=list[LiabilityRead])
def list_liabilities(db: Session = Depends(get_db)):
    return db.query(Liability).order_by(Liability.name).all()


@router.post("", response_model=LiabilityRead, status_code=201)
def create_liability(payload: LiabilityCreate, db: Session = Depends(get_db)):
    liability = Liability(**payload.model_dump())
    db.add(liability)
    db.commit()
    db.refresh(liability)
    return liability


@router.patch("/{liability_id}", response_model=LiabilityRead)
def update_liability(
    liability_id: int, payload: LiabilityUpdate, db: Session = Depends(get_db)
):
    liability = db.get(Liability, liability_id)
    if liability is None:
        raise HTTPException(status_code=404, detail="Liability not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(liability, field, value)
    db.commit()
    db.refresh(liability)
    return liability


@router.delete("/{liability_id}", status_code=204)
def delete_liability(liability_id: int, db: Session = Depends(get_db)):
    liability = db.get(Liability, liability_id)
    if liability is None:
        raise HTTPException(status_code=404, detail="Liability not found")
    db.delete(liability)
    db.commit()
