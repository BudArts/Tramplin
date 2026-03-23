# backend/app/models/company.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class CompanyStatus(str, enum.Enum):
    PENDING_EMAIL = "pending_email"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending_email"
    VERIFIED = "active"
    REJECTED = "rejected"


class CompanySize(str, enum.Enum):
    MICRO = "micro"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class TrustLevel(str, enum.Enum):
    NEW = "new"
    TRUSTED = "trusted"
    VERIFIED = "verified"


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    inn = Column(String(12), unique=True, index=True, nullable=False)
    ogrn = Column(String(15), nullable=True)
    kpp = Column(String(9), nullable=True)
    name = Column(String(500), nullable=True)
    full_name = Column(String(500), nullable=False)
    short_name = Column(String(255), nullable=True)
    brand_name = Column(String(255), nullable=True)
    legal_address = Column(Text, nullable=True)
    actual_address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    director_name = Column(String(255), nullable=True)
    director_position = Column(String(100), nullable=True)
    owner_id = Column(Integer, nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)
    social_links = Column(JSON, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(CompanyStatus), default=CompanyStatus.PENDING_EMAIL, nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(Integer, nullable=True)
    trust_level = Column(Enum(TrustLevel), default=TrustLevel.NEW, nullable=True)
    approved_cards_count = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    industry = Column(String(255), nullable=True)
    size = Column(Enum(CompanySize), nullable=True)
    founded_year = Column(Integer, nullable=True)
    employee_count = Column(Integer, nullable=True)
    logo_url = Column(String(500), nullable=True)
    cover_url = Column(String(500), nullable=True)
    fns_data = Column(JSON, nullable=True)
    fns_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employees = relationship("User", back_populates="company")
    opportunities = relationship("Opportunity", back_populates="company")
    # Добавьте эти поля в класс Company (после существующих полей)
    rating = Column(Float, default=0.0)  # Средний рейтинг
    reviews_count = Column(Integer, default=0)  # Количество отзывов


# Добавьте relationship
    reviews = relationship("Review", back_populates="company", cascade="all, delete-orphan")

    @property
    def is_active(self) -> bool:
        return self.status == CompanyStatus.ACTIVE and self.is_email_verified

    @property
    def display_name(self) -> str:
        return self.brand_name or self.short_name or self.name or self.full_name