import enum
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import (
    String, Text, Enum, DateTime, Date, Integer,
    ForeignKey, Numeric, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY

from app.database import Base
from app.models.tag import opportunity_tags


class OpportunityType(str, enum.Enum):
    INTERNSHIP = "internship"
    VACANCY = "vacancy"
    MENTORSHIP = "mentorship"
    EVENT = "event"


class WorkFormat(str, enum.Enum):
    OFFICE = "office"
    HYBRID = "hybrid"
    REMOTE = "remote"


class OpportunityStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_MODERATION = "pending_moderation"
    ACTIVE = "active"
    SCHEDULED = "scheduled"
    CLOSED = "closed"
    REJECTED = "rejected"


class ModerationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[OpportunityType] = mapped_column(
        Enum(OpportunityType), index=True, nullable=False
    )
    work_format: Mapped[WorkFormat] = mapped_column(
        Enum(WorkFormat), nullable=False
    )

    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)

    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[OpportunityStatus] = mapped_column(
        Enum(OpportunityStatus), default=OpportunityStatus.DRAFT, index=True
    )
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        Enum(ModerationStatus), default=ModerationStatus.PENDING
    )
    moderation_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    moderated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    media_urls: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    views_count: Mapped[int] = mapped_column(Integer, default=0)
    applications_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="opportunities")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=opportunity_tags, back_populates="opportunities"
    )
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="opportunity", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Opportunity {self.id} {self.title} [{self.status.value}]>"