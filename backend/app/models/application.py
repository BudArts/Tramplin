import enum
from datetime import datetime

from sqlalchemy import (
    Text, Enum, DateTime, Integer, ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    RESERVE = "reserve"


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("applicant_id", "opportunity_id", name="uq_application"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    applicant_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    opportunity_id: Mapped[int] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.PENDING
    )
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    applicant: Mapped["User"] = relationship("User")
    opportunity: Mapped["Opportunity"] = relationship(
        "Opportunity", back_populates="applications"
    )

    def __repr__(self):
        return f"<Application {self.id} user={self.applicant_id} opp={self.opportunity_id} [{self.status.value}]>"