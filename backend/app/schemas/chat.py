from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.user import UserShort


class ChatMessageCreate(BaseModel):
    receiver_id: int
    opportunity_id: int | None = None
    message: str = Field(min_length=1, max_length=5000)


class ChatMessageResponse(BaseModel):
    id: int
    sender: UserShort
    receiver: UserShort
    opportunity_id: int | None = None
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    user: UserShort
    last_message: str
    last_message_at: datetime
    unread_count: int
    opportunity_id: int | None = None