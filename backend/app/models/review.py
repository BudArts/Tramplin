"""
Модель отзывов компаний
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, ForeignKey,
    DateTime, UniqueConstraint, CheckConstraint, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Review(Base):
    """Отзыв о компании"""
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Связи
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Рейтинг и содержимое
    rating = Column(Integer, nullable=False)  # 1-5
    title = Column(String(200), nullable=True)
    text = Column(Text, nullable=True)
    pros = Column(Text, nullable=True)  # Плюсы
    cons = Column(Text, nullable=True)  # Минусы
    
    # Дополнительные поля
    is_anonymous = Column(Boolean, default=False)  # Анонимный отзыв
    is_verified = Column(Boolean, default=False)   # Подтверждённый (работал в компании)
    is_hidden = Column(Boolean, default=False)     # Скрыт модератором
    
    # Полезность отзыва
    helpful_count = Column(Integer, default=0)     # Сколько раз отметили полезным
    
    # Ответ компании
    company_response = Column(Text, nullable=True)
    company_response_at = Column(DateTime(timezone=True), nullable=True)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Связи
    company = relationship("Company", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    
    # Ограничения
    __table_args__ = (
        # Один пользователь - один отзыв на компанию
        UniqueConstraint('company_id', 'user_id', name='unique_company_user_review'),
        # Рейтинг от 1 до 5
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    )
    
    def __repr__(self):
        return f"<Review(id={self.id}, company_id={self.company_id}, user_id={self.user_id}, rating={self.rating})>"


class ReviewHelpful(Base):
    """Отметки полезности отзывов"""
    __tablename__ = "review_helpful"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_helpful = Column(Boolean, default=True)  # True - полезно, False - не полезно
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('review_id', 'user_id', name='unique_review_user_helpful'),
    )