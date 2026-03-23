"""
Схемы для отзывов
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ReviewBase(BaseModel):
    """Базовая схема отзыва"""
    rating: int = Field(..., ge=1, le=5, description="Рейтинг от 1 до 5")
    title: Optional[str] = Field(None, max_length=200)
    text: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    is_anonymous: bool = False


class ReviewCreate(ReviewBase):
    """Создание отзыва"""
    pass


class ReviewUpdate(BaseModel):
    """Обновление отзыва"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    text: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    is_anonymous: Optional[bool] = None


class CompanyResponseCreate(BaseModel):
    """Ответ компании на отзыв"""
    response: str = Field(..., min_length=10, max_length=2000)


class ReviewAuthor(BaseModel):
    """Автор отзыва"""
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReviewResponse(ReviewBase):
    """Ответ с отзывом"""
    id: int
    company_id: int
    user_id: int
    is_verified: bool
    is_hidden: bool
    helpful_count: int
    company_response: Optional[str] = None
    company_response_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Автор (если не анонимный)
    author: Optional[ReviewAuthor] = None
    
    # Текущий пользователь отметил полезным
    user_marked_helpful: Optional[bool] = None
    
    class Config:
        from_attributes = True


class ReviewListResponse(BaseModel):
    """Список отзывов"""
    items: list[ReviewResponse]
    total: int
    page: int
    per_page: int
    pages: int


class CompanyRatingStats(BaseModel):
    """Статистика рейтинга компании"""
    average_rating: float
    total_reviews: int
    rating_distribution: dict[int, int]  # {1: 5, 2: 10, 3: 20, 4: 30, 5: 35}