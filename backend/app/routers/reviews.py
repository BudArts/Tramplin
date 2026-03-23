"""
API эндпоинты для отзывов
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.review import (
    ReviewCreate, ReviewUpdate, ReviewResponse,
    ReviewListResponse, CompanyResponseCreate, CompanyRatingStats
)
from app.services.review_service import ReviewService

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.post("/companies/{company_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    company_id: int,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать отзыв о компании"""
    service = ReviewService(db)
    review = await service.create_review(company_id, current_user.id, data)
    return review


@router.get("/companies/{company_id}", response_model=ReviewListResponse)
async def get_company_reviews(
    company_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(created_at|rating_high|rating_low|helpful)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить отзывы компании"""
    service = ReviewService(db)
    reviews, total = await service.get_company_reviews(
        company_id, page, per_page, sort_by, current_user.id
    )
    
    pages = (total + per_page - 1) // per_page
    
    return ReviewListResponse(
        items=reviews,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get("/companies/{company_id}/stats", response_model=CompanyRatingStats)
async def get_company_rating_stats(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить статистику рейтинга компании"""
    service = ReviewService(db)
    return await service.get_company_rating_stats(company_id)


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить отзыв по ID"""
    from fastapi import HTTPException
    service = ReviewService(db)
    review = await service.get_review(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отзыв не найден")
    return review


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить отзыв"""
    service = ReviewService(db)
    return await service.update_review(review_id, current_user.id, data)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить отзыв"""
    service = ReviewService(db)
    await service.delete_review(review_id, current_user.id)


@router.post("/{review_id}/response", response_model=ReviewResponse)
async def add_company_response(
    review_id: int,
    data: CompanyResponseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Добавить ответ компании на отзыв"""
    service = ReviewService(db)
    return await service.add_company_response(review_id, current_user.id, data)


@router.post("/{review_id}/helpful", response_model=ReviewResponse)
async def mark_review_helpful(
    review_id: int,
    is_helpful: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отметить отзыв полезным/не полезным"""
    service = ReviewService(db)
    return await service.mark_helpful(review_id, current_user.id, is_helpful)