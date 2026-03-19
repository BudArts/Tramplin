from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.models.opportunity import (
    OpportunityType, WorkFormat, OpportunityStatus, ModerationStatus,
)
from app.schemas.tag import TagResponse
from app.schemas.company import CompanyShort


class OpportunityCreate(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    description: str = Field(min_length=10)
    type: OpportunityType
    work_format: WorkFormat
    salary_min: int | None = Field(None, ge=0)
    salary_max: int | None = Field(None, ge=0)
    address: str | None = Field(None, max_length=500)
    city: str = Field(min_length=1, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    expires_at: date | None = None
    event_date: date | None = None
    media_urls: list[str] | None = None
    contact_email: str | None = Field(None, max_length=255)
    contact_phone: str | None = Field(None, max_length=50)
    external_url: str | None = Field(None, max_length=500)
    tag_ids: list[int] = Field(default_factory=list)

    @field_validator("salary_max")
    @classmethod
    def validate_salary_range(cls, v, info):
        salary_min = info.data.get("salary_min")
        if v is not None and salary_min is not None and v < salary_min:
            raise ValueError("salary_max не может быть меньше salary_min")
        return v


class OpportunityUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=300)
    description: str | None = Field(None, min_length=10)
    type: OpportunityType | None = None
    work_format: WorkFormat | None = None
    salary_min: int | None = Field(None, ge=0)
    salary_max: int | None = Field(None, ge=0)
    address: str | None = Field(None, max_length=500)
    city: str | None = Field(None, min_length=1, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    expires_at: date | None = None
    event_date: date | None = None
    media_urls: list[str] | None = None
    contact_email: str | None = Field(None, max_length=255)
    contact_phone: str | None = Field(None, max_length=50)
    external_url: str | None = Field(None, max_length=500)
    tag_ids: list[int] | None = None


class OpportunityResponse(BaseModel):
    id: int
    title: str
    description: str
    type: OpportunityType
    work_format: WorkFormat
    salary_min: int | None = None
    salary_max: int | None = None
    address: str | None = None
    city: str
    latitude: float | None = None
    longitude: float | None = None
    published_at: datetime | None = None
    expires_at: date | None = None
    event_date: date | None = None
    status: OpportunityStatus
    moderation_status: ModerationStatus
    media_urls: list[str] | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    external_url: str | None = None
    views_count: int = 0
    applications_count: int = 0
    created_at: datetime
    tags: list[TagResponse] = []
    company: CompanyShort | None = None

    model_config = {"from_attributes": True}


class OpportunityListResponse(BaseModel):
    items: list[OpportunityResponse]
    total: int
    page: int
    per_page: int
    pages: int


class OpportunityCardResponse(BaseModel):
    """Краткая карточка для списка."""
    id: int
    title: str
    type: OpportunityType
    work_format: WorkFormat
    salary_min: int | None = None
    salary_max: int | None = None
    city: str
    company_name: str | None = None
    company_logo: str | None = None
    tags: list[TagResponse] = []
    published_at: datetime | None = None

    model_config = {"from_attributes": True}


class MapPointResponse(BaseModel):
    """Лёгкий объект для маркера на карте."""
    id: int
    title: str
    type: OpportunityType
    latitude: float
    longitude: float
    company_id: int
    company_name: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    top_tags: list[str] = []
    is_favorite_company: bool = False


class StatusUpdate(BaseModel):
    status: OpportunityStatus