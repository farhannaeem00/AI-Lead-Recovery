
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base
from decimal import Decimal
import sqlalchemy as sa


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    full_name: Mapped[str] = mapped_column(
        String(150), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    budget: Mapped[Decimal | None] = mapped_column(
    sa.Numeric(14, 2),
    nullable=True,
)

    budget_currency: Mapped[str | None] = mapped_column(
    String(3),
    nullable=True,
)

    budget_legacy: Mapped[str | None] = mapped_column(
    String(100),
    nullable=True,
)
    location: Mapped[str | None] = mapped_column(
        String(150), nullable=True
    )
    timeline: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="new"
    )
    score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    priority: Mapped[str] = mapped_column(
        String(10), nullable=False, default="cold", server_default="cold"
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    follow_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    follow_up_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending",
        server_default="pending",
    )
    follow_up_note: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    # Nullable temporarily to preserve leads created before authentication.
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )


class FollowUpActivity(Base):
    """Immutable audit event for changes to a lead's follow-up plan."""

    __tablename__ = "follow_up_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
