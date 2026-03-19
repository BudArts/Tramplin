from datetime import datetime
from pydantic import BaseModel, Field
from app.models.company import VerificationStatus, TrustLevel


class CompanyResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    industry: str | None = None
    website: str | None = None
    social_links: list[str] | None = None
    logo_url: str | None = None
    office_photos: list[str] | None = None
    city: str | None = None
    verification_status: VerificationStatus
    trust_level: TrustLevel
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyShort(BaseModel):
    id: int
    name: str
    industry: str | None = None
    logo_url: str | None = None
    city: str | None = None
    verification_status: VerificationStatus

    model_config = {"from_attributes": True}


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=300)
    description: str | None = Field(None, max_length=5000)
    industry: str | None = Field(None, max_length=200)
    website: str | None = Field(None, max_length=500)
    social_links: list[str] | None = None
    logo_url: str | None = Field(None, max_length=500)
    office_photos: list[str] | None = None
    city: str | None = Field(None, max_length=200)
    corporate_email: str | None = Field(None, max_length=255)


class CompanyDetailResponse(CompanyResponse):
    """Расширенный ответ с данными владельца и ИНН (для куратора)."""
    inn: str | None = None
    corporate_email: str | None = None
    verification_comment: str | None = None
    verified_at: datetime | None = None
    approved_cards_count: int = 0
    owner_id: int

    model_config = {"from_attributes": True}


class VerificationRequest(BaseModel):
    """Запрос на верификацию от работодателя."""
    inn: str = Field(min_length=10, max_length=12)
    corporate_email: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=500)
    comment: str | None = Field(None, max_length=1000)