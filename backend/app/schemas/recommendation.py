# backend/app/schemas/recommendation.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class RecommendationResponse(BaseModel):
    """Ответ с рекомендацией"""
    id: int
    from_user: dict
    recommended_user: Optional[dict] = None
    opportunity_id: int
    opportunity_title: Optional[str] = None
    message: Optional[str] = None
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True