import enum
from datetime import datetime

from sqlalchemy import (
    String, Boolean, Enum, DateTime, Integer, Text, ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    APPLICANT = "applicant"
    EMPLOYER = "employer"
    CURATOR = "curator"
    ADMIN = "admin"


class PrivacyLevel(str, enum.Enum):
    PRIVATE = "private"
    CONTACTS = "contacts"
    PUBLIC = "public"
    FULL_PUBLIC = "full_public"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), nullable=False, default=UserRole.APPLICANT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    applicant_profile: Mapped["ApplicantProfile | None"] = relationship(
        "ApplicantProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    company: Mapped["Company | None"] = relationship(
        "Company", back_populates="owner", uselist=False,
        foreign_keys="Company.owner_id", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.id} {self.email} [{self.role.value}]>"


class ApplicantProfile(Base):
    __tablename__ = "applicant_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    patronymic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    university: Mapped[str | None] = mapped_column(String(300), nullable=True)
    faculty: Mapped[str | None] = mapped_column(String(300), nullable=True)
    course: Mapped[int | None] = mapped_column(Integer, nullable=True)
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel), default=PrivacyLevel.CONTACTS
    )
    show_applications_to_contacts: Mapped[bool] = mapped_column(Boolean, default=False)
    show_resume_to_all: Mapped[bool] = mapped_column(Boolean, default=False)
    profile_completeness: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="applicant_profile")
    skills: Mapped[list["Tag"]] = relationship(
        "Tag", secondary="applicant_tags", back_populates="applicants"
    )

    def __repr__(self):
        return f"<ApplicantProfile {self.user_id} {self.first_name} {self.last_name}>"