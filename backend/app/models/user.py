# backend/app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    APPLICANT = "student"
    COMPANY = "company"
    EMPLOYER = "company"
    CURATOR = "curator"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class PrivacyLevel(str, enum.Enum):
    PUBLIC = "public"
    CONTACTS = "contacts"
    FULL_PUBLIC = "full_public"
    PRIVATE = "private"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    patronymic = Column(String(100), nullable=True)
    display_name = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_sent_at = Column(DateTime(timezone=True), nullable=True)
    university = Column(String(255), nullable=True)
    faculty = Column(String(255), nullable=True)
    course = Column(Integer, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    resume_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    telegram = Column(String(100), nullable=True)
    privacy_level = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="employees")
    tags = relationship("Tag", secondary="user_tags", back_populates="users")
    notifications = relationship(
        "Notification", back_populates="user",
        foreign_keys="Notification.user_id",
        cascade="all, delete-orphan"
    )
    favorites = relationship(
        "Favorite", back_populates="user",
        foreign_keys="Favorite.user_id",
        cascade="all, delete-orphan"
    )
    applications = relationship(
        "Application", back_populates="applicant",
        foreign_keys="Application.applicant_id",
        cascade="all, delete-orphan"
    )
    contacts = relationship(
        "Contact", back_populates="user",
        foreign_keys="Contact.user_id",
        cascade="all, delete-orphan"
    )
    sent_messages = relationship(
        "ChatMessage", back_populates="sender",
        foreign_keys="ChatMessage.sender_id"
    )
    received_messages = relationship(
        "ChatMessage", back_populates="receiver",
        foreign_keys="ChatMessage.receiver_id"
    )
    support_tickets = relationship(
        "SupportTicket", back_populates="user",
        foreign_keys="SupportTicket.user_id",
        cascade="all, delete-orphan"
    )
    
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    notification_settings = relationship("NotificationSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    # sent_recommendations и received_recommendations
    # создаются автоматически через backref в Recommendation

    @property
    def full_name(self) -> str:
        if self.display_name:
            return self.display_name
        parts = [self.last_name, self.first_name]
        if self.patronymic:
            parts.append(self.patronymic)
        return " ".join(filter(None, parts))

    @property
    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE and self.is_email_verified

    @property
    def password_hash(self) -> str:
        return self.hashed_password

    @password_hash.setter
    def password_hash(self, value: str):
        self.hashed_password = value


ApplicantProfile = User