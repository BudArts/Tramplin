import enum
from datetime import datetime

from sqlalchemy import (
    String, Text, Enum, DateTime, Integer, ForeignKey, Boolean, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY

from app.database import Base


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    EMAIL_CONFIRMED = "email_confirmed"
    INN_VERIFIED = "inn_verified"
    VERIFIED = "verified"
    REJECTED = "rejected"


class TrustLevel(str, enum.Enum):
    NEW = "new"
    TRUSTED = "trusted"
    PREMIUM = "premium"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(300), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_links: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    office_photos: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    inn: Mapped[str | None] = mapped_column(String(12), nullable=True, index=True)
    corporate_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(200), nullable=True)

    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), default=VerificationStatus.PENDING
    )
    verification_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verified_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    trust_level: Mapped[TrustLevel] = mapped_column(
        Enum(TrustLevel), default=TrustLevel.NEW
    )
    approved_cards_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User", back_populates="company", foreign_keys=[owner_id]
    )
    opportunities: Mapped[list["Opportunity"]] = relationship(
        "Opportunity", back_populates="company", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Company {self.id} {self.name} [{self.verification_status.value}]>"