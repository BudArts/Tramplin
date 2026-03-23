"""
Модель уведомлений
"""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, ForeignKey,
    DateTime, Enum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class NotificationType(str, enum.Enum):
    """Типы уведомлений"""
    # Системные
    SYSTEM = "system"
    WELCOME = "welcome"
    
    # Компания
    COMPANY_VERIFIED = "company_verified"
    COMPANY_REJECTED = "company_rejected"
    COMPANY_STATUS_CHANGED = "company_status_changed"
    
    # Карточки возможностей
    CARD_APPROVED = "card_approved"
    CARD_REJECTED = "card_rejected"
    CARD_EXPIRES_SOON = "card_expires_soon"
    CARD_EXPIRED = "card_expired"
    
    # Отклики
    APPLICATION_RECEIVED = "application_received"
    APPLICATION_VIEWED = "application_viewed"
    APPLICATION_STATUS_CHANGED = "application_status_changed"
    APPLICATION_ACCEPTED = "application_accepted"
    APPLICATION_REJECTED = "application_rejected"
    
    # Отзывы
    NEW_REVIEW = "new_review"
    REVIEW_RESPONSE = "review_response"
    
    # Избранное
    FAVORITE_CARD_UPDATED = "favorite_card_updated"
    FAVORITE_CARD_EXPIRES = "favorite_card_expires"
    
    # Сообщения
    NEW_MESSAGE = "new_message"


class Notification(Base):
    """Уведомление пользователя"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Получатель
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Тип и содержимое
    type = Column(Enum(NotificationType), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    
    # Дополнительные данные (ссылки, ID сущностей и т.д.)
    data = Column(JSON, nullable=True)
    
    # Статус прочтения
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Email уведомление
    is_email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Связи
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, is_read={self.is_read})>"


class NotificationSettings(Base):
    """Настройки уведомлений пользователя"""
    __tablename__ = "notification_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Email уведомления
    email_system = Column(Boolean, default=True)
    email_applications = Column(Boolean, default=True)
    email_reviews = Column(Boolean, default=True)
    email_favorites = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    
    # Push уведомления (на будущее)
    push_enabled = Column(Boolean, default=True)
    push_system = Column(Boolean, default=True)
    push_applications = Column(Boolean, default=True)
    push_reviews = Column(Boolean, default=True)
    
    # Связи
    user = relationship("User", back_populates="notification_settings")