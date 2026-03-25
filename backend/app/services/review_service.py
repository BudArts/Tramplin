"""
Сервис для работы с отзывами
"""
from typing import Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.review import Review, ReviewHelpful
from app.models.company import Company
from app.schemas.review import ReviewCreate, ReviewUpdate, CompanyResponseCreate
from app.services.notification_service import NotificationService


class ReviewService:
    """Сервис отзывов"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notification_service = NotificationService(db)
    
    async def update_company_rating(self, db: AsyncSession, company_id: int):
        """Обновление рейтинга компании на основе отзывов"""
        from app.models.company import Company
        
        # Получаем все активные отзывы компании
        query = select(Review).where(
            Review.company_id == company_id,
            Review.is_hidden == False
        )
        result = await db.execute(query)
        reviews = result.scalars().all()
        
        if reviews:
            # Вычисляем средний рейтинг
            total_rating = sum(r.rating for r in reviews)
            avg_rating = total_rating / len(reviews)
            
            # Обновляем компанию
            company_query = select(Company).where(Company.id == company_id)
            company_result = await db.execute(company_query)
            company = company_result.scalar_one()
            
            company.rating = round(avg_rating, 1)
            company.reviews_count = len(reviews)
            
            await db.commit()
        else:
            # Если отзывов нет, сбрасываем рейтинг
            company_query = select(Company).where(Company.id == company_id)
            company_result = await db.execute(company_query)
            company = company_result.scalar_one()
            
            company.rating = 0.0
            company.reviews_count = 0
            
            await db.commit()
    
    async def create_review(
        self,
        company_id: int,
        user_id: int,
        data: ReviewCreate
    ) -> Review:
        """Создать отзыв"""
        # Проверяем, что компания существует
        company = await self.db.get(Company, company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Компания не найдена"
            )
        
        # Проверяем, что пользователь ещё не оставлял отзыв
        existing = await self.db.execute(
            select(Review).where(
                and_(
                    Review.company_id == company_id,
                    Review.user_id == user_id
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Вы уже оставляли отзыв для этой компании"
            )
        
        # Создаём отзыв
        review = Review(
            company_id=company_id,
            user_id=user_id,
            **data.model_dump()
        )
        self.db.add(review)
        
        # Обновляем рейтинг компании
        await self._update_company_rating(company_id)
        
        await self.db.commit()
        await self.db.refresh(review)
        
        # Отправляем уведомление владельцу компании
        if company.owner_id:
            await self.notification_service.create_notification(
                user_id=company.owner_id,
                notification_type="new_review",
                title="Новый отзыв о компании",
                message=f"Пользователь оставил отзыв с оценкой {data.rating}/5",
                data={"company_id": company_id, "review_id": review.id}
            )
        
        return review
    
    async def get_review(self, review_id: int) -> Optional[Review]:
        """Получить отзыв по ID"""
        result = await self.db.execute(
            select(Review)
            .options(selectinload(Review.user))
            .where(Review.id == review_id)
        )
        return result.scalar_one_or_none()
    
    async def get_company_reviews(
        self,
        company_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        current_user_id: Optional[int] = None
    ) -> tuple[list[Review], int]:
        """Получить отзывы компании"""
        query = (
            select(Review)
            .options(selectinload(Review.user))
            .where(
                and_(
                    Review.company_id == company_id,
                    Review.is_hidden == False
                )
            )
        )
        
        # Сортировка
        if sort_by == "rating_high":
            query = query.order_by(Review.rating.desc())
        elif sort_by == "rating_low":
            query = query.order_by(Review.rating.asc())
        elif sort_by == "helpful":
            query = query.order_by(Review.helpful_count.desc())
        else:
            query = query.order_by(Review.created_at.desc())
        
        # Подсчёт
        count_query = select(func.count(Review.id)).where(
            and_(
                Review.company_id == company_id,
                Review.is_hidden == False
            )
        )
        total = await self.db.execute(count_query)
        total = total.scalar()
        
        # Пагинация
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        
        result = await self.db.execute(query)
        reviews = list(result.scalars().all())
        
        return reviews, total
    
    async def update_review(
        self,
        review_id: int,
        user_id: int,
        data: ReviewUpdate
    ) -> Review:
        """Обновить отзыв"""
        review = await self.get_review(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отзыв не найден"
            )
        
        if review.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет прав на редактирование этого отзыва"
            )
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(review, field, value)
        
        # Обновляем рейтинг компании если изменился рейтинг
        if "rating" in update_data:
            await self._update_company_rating(review.company_id)
        
        await self.db.commit()
        await self.db.refresh(review)
        
        return review
    
    async def delete_review(self, review_id: int, user_id: int) -> bool:
        """Удалить отзыв"""
        review = await self.get_review(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отзыв не найден"
            )
        
        if review.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет прав на удаление этого отзыва"
            )
        
        company_id = review.company_id
        await self.db.delete(review)
        
        # Обновляем рейтинг компании
        await self._update_company_rating(company_id)
        
        await self.db.commit()
        return True
    
    async def add_company_response(
        self,
        review_id: int,
        company_owner_id: int,
        data: CompanyResponseCreate
    ) -> Review:
        """Добавить ответ компании на отзыв"""
        review = await self.get_review(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отзыв не найден"
            )
        
        # Проверяем, что пользователь - владелец компании
        company = await self.db.get(Company, review.company_id)
        if company.owner_id != company_owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только владелец компании может отвечать на отзывы"
            )
        
        from datetime import datetime, timezone
        review.company_response = data.response
        review.company_response_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(review)
        
        # Уведомляем автора отзыва
        await self.notification_service.create_notification(
            user_id=review.user_id,
            notification_type="review_response",
            title="Ответ на ваш отзыв",
            message=f"Компания {company.name} ответила на ваш отзыв",
            data={"company_id": company.id, "review_id": review_id}
        )
        
        return review
    
    async def mark_helpful(
        self,
        review_id: int,
        user_id: int,
        is_helpful: bool = True
    ) -> Review:
        """Отметить отзыв полезным/не полезным"""
        review = await self.get_review(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отзыв не найден"
            )
        
        # Проверяем существующую отметку
        existing = await self.db.execute(
            select(ReviewHelpful).where(
                and_(
                    ReviewHelpful.review_id == review_id,
                    ReviewHelpful.user_id == user_id
                )
            )
        )
        helpful = existing.scalar_one_or_none()
        
        if helpful:
            if helpful.is_helpful == is_helpful:
                # Убираем отметку
                await self.db.delete(helpful)
                review.helpful_count = max(0, review.helpful_count - (1 if is_helpful else 0))
            else:
                # Меняем отметку
                helpful.is_helpful = is_helpful
                review.helpful_count += 1 if is_helpful else -1
        else:
            # Добавляем отметку
            new_helpful = ReviewHelpful(
                review_id=review_id,
                user_id=user_id,
                is_helpful=is_helpful
            )
            self.db.add(new_helpful)
            if is_helpful:
                review.helpful_count += 1
        
        await self.db.commit()
        await self.db.refresh(review)
        
        return review
    
    async def get_company_rating_stats(self, company_id: int) -> dict:
        """Получить статистику рейтинга компании"""
        # Средний рейтинг и количество
        stats_query = select(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("total")
        ).where(
            and_(
                Review.company_id == company_id,
                Review.is_hidden == False
            )
        )
        result = await self.db.execute(stats_query)
        stats = result.first()
        
        # Распределение по рейтингам
        distribution_query = select(
            Review.rating,
            func.count(Review.id)
        ).where(
            and_(
                Review.company_id == company_id,
                Review.is_hidden == False
            )
        ).group_by(Review.rating)
        
        dist_result = await self.db.execute(distribution_query)
        distribution = {i: 0 for i in range(1, 6)}
        for rating, count in dist_result.all():
            distribution[rating] = count
        
        return {
            "average_rating": round(float(stats.avg_rating or 0), 1),
            "total_reviews": stats.total or 0,
            "rating_distribution": distribution
        }
    
    async def _update_company_rating(self, company_id: int) -> None:
        """Обновить рейтинг компании"""
        stats = await self.get_company_rating_stats(company_id)
        
        company = await self.db.get(Company, company_id)
        if company:
            company.rating = stats["average_rating"]
            company.reviews_count = stats["total_reviews"]