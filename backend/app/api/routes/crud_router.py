from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column
from sqlalchemy.orm import Session

from app.core.database import get_db


def get_or_404[ModelT](db: Session, model: type[ModelT], item_id: int, entity_name: str) -> ModelT:
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{entity_name} not found")
    return item


def make_crud_router(
    *,
    prefix: str,
    tag: str,
    model: type,
    create_schema: type,
    update_schema: type,
    read_schema: type,
    entity_name: str,
    order_by: Column,
    filter_column: Column | None = None,
    validate_create: Callable[[Session, object], None] | None = None,
    include_get_by_id: bool = False,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    @router.get("", response_model=list[read_schema])
    def list_items(
        account_id: int | None = Query(default=None, include_in_schema=filter_column is not None),
        db: Session = Depends(get_db),
    ):
        query = db.query(model)
        if filter_column is not None and account_id is not None:
            query = query.filter(filter_column == account_id)
        return query.order_by(order_by).all()

    @router.post("", response_model=read_schema, status_code=201)
    def create_item(payload: create_schema, db: Session = Depends(get_db)):
        if validate_create is not None:
            validate_create(db, payload)
        item = model(**payload.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    if include_get_by_id:

        @router.get("/{item_id}", response_model=read_schema)
        def get_item(item_id: int, db: Session = Depends(get_db)):
            return get_or_404(db, model, item_id, entity_name)

    @router.patch("/{item_id}", response_model=read_schema)
    def update_item(item_id: int, payload: update_schema, db: Session = Depends(get_db)):
        item = get_or_404(db, model, item_id, entity_name)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        item = get_or_404(db, model, item_id, entity_name)
        db.delete(item)
        db.commit()

    return router
