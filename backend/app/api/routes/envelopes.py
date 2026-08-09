from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.envelope import Envelope
from app.schemas.envelope import EnvelopeCreate, EnvelopeRead, EnvelopeUpdate

router = APIRouter(prefix="/envelopes", tags=["envelopes"])


@router.get("", response_model=list[EnvelopeRead])
def list_envelopes(db: Session = Depends(get_db)):
    return db.query(Envelope).order_by(Envelope.name).all()


@router.post("", response_model=EnvelopeRead, status_code=201)
def create_envelope(payload: EnvelopeCreate, db: Session = Depends(get_db)):
    envelope = Envelope(**payload.model_dump())
    db.add(envelope)
    db.commit()
    db.refresh(envelope)
    return envelope


@router.patch("/{envelope_id}", response_model=EnvelopeRead)
def update_envelope(
    envelope_id: int, payload: EnvelopeUpdate, db: Session = Depends(get_db)
):
    envelope = db.get(Envelope, envelope_id)
    if envelope is None:
        raise HTTPException(status_code=404, detail="Envelope not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(envelope, field, value)
    db.commit()
    db.refresh(envelope)
    return envelope


@router.delete("/{envelope_id}", status_code=204)
def delete_envelope(envelope_id: int, db: Session = Depends(get_db)):
    envelope = db.get(Envelope, envelope_id)
    if envelope is None:
        raise HTTPException(status_code=404, detail="Envelope not found")
    db.delete(envelope)
    db.commit()
