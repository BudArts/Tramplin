from datetime import datetime
from pydantic import BaseModel, Field
from app.models.contact import ContactStatus
from app.schemas.user import UserShort


class ContactResponse(BaseModel):
    id: int
    user: UserShort
    contact: UserShort
    status: ContactStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int


class RecommendationCreate(BaseModel):
    to_user_id: int
    opportunity_id: int
    message: str | None = Field(None, max_length=500)


class RecommendationResponse(BaseModel):
    id: int
    from_user: UserShort
    opportunity_id: int
    message: str | None = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}