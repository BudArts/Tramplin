from pydantic import BaseModel, Field
from app.models.company import VerificationStatus
from app.models.opportunity import ModerationStatus


class VerificationDecision(BaseModel):
    status: VerificationStatus
    comment: str | None = Field(None, max_length=1000)


class ModerationDecision(BaseModel):
    status: ModerationStatus
    comment: str | None = Field(None, max_length=1000)


class UserStatusUpdate(BaseModel):
    is_active: bool


class CuratorCreate(BaseModel):
    email: str
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=2, max_length=150)


class PlatformStats(BaseModel):
    total_users: int
    total_applicants: int
    total_employers: int
    total_opportunities: int
    active_opportunities: int
    total_applications: int
    pending_verifications: int
    pending_moderations: int
    total_tags: int