"""
Схемы для уведомлений
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    """Ответ с уведомлением"""
    id: int
    type: NotificationType
    title: str
    message: Optional[str] = None
    data: Optional[dict[str, Any]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Список уведомлений"""
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationSettingsUpdate(BaseModel):
    """Обновление настроек уведомлений"""
    email_system: Optional[bool] = None
    email_applications: Optional[bool] = None
    email_reviews: Optional[bool] = None
    email_favorites: Optional[bool] = None
    email_marketing: Optional[bool] = None
    push_enabled: Optional[bool] = None
    push_system: Optional[bool] = None
    push_applications: Optional[bool] = None
    push_reviews: Optional[bool] = None


class NotificationSettingsResponse(BaseModel):
    """Настройки уведомлений"""
    email_system: bool
    email_applications: bool
    email_reviews: bool
    email_favorites: bool
    email_marketing: bool
    push_enabled: bool
    push_system: bool
    push_applications: bool
    push_reviews: bool
    
    class Config:
        from_attributes = True


class MarkReadRequest(BaseModel):
    """Запрос на отметку прочитанными"""
    notification_ids: list[int]