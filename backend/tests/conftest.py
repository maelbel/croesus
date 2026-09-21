from collections.abc import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401 — registers every mapped class on Base.metadata before create_all
from app.core.database import Base


@pytest.fixture
def db_session() -> Generator[Session]:
    """A fresh in-memory SQLite database per test — isolated from both the
    dev SQLite file and Postgres, and from every other test."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
