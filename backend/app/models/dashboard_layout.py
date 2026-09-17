from datetime import datetime

from sqlalchemy import JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DashboardLayout(Base):
    """Singleton row (id fixed at 1) holding the dashboard's widget layout."""

    __tablename__ = "dashboard_layouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    widgets: Mapped[list[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
