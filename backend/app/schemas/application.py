from datetime import datetime
from pydantic import BaseModel, Field
from app.models.application import ApplicationStatus
from app.schemas.user import UserShort, ApplicantPublicProfile
from app.schemas.opportunity import OpportunityCardResponse


class ApplicationCreate(BaseModel):
    opportunity_id: int
    cover_letter: str | None = Field(None, max_length=3000)


class ApplicationResponse(BaseModel):
    id: int
    applicant_id: int
    opportunity_id: int
    status: ApplicationStatus
    cover_letter: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplicationWithOpportunity(ApplicationResponse):
    """Для соискателя: отклик + информация о вакансии."""
    opportunity: OpportunityCardResponse | None = None


class ApplicationWithApplicant(ApplicationResponse):
    """Для работодателя: отклик + информация о соискателе."""
    applicant: UserShort | None = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus

    @classmethod
    def validate_employer_status(cls, v):
        allowed = {
            ApplicationStatus.VIEWED,
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.RESERVE,
        }
        if v not in allowed:
            raise ValueError(f"Работодатель может установить статус: {', '.join(s.value for s in allowed)}")
        return v


class ApplicationListResponse(BaseModel):
    items: list[ApplicationWithOpportunity]
    total: int
    page: int
    per_page: int
    pages: int