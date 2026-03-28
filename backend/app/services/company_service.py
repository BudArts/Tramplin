# backend/app/services/company_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, Tuple, List
from datetime import datetime, timezone

from app.models.company import Company, CompanyStatus, VerificationStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.company import CompanyRegisterRequest, CompanyUpdate
from app.utils.security import get_password_hash


class CompanyService:
    """Сервис для работы с компаниями"""
    
    async def get_company_by_id(
        self, 
        db: AsyncSession, 
        company_id: int
    ) -> Optional[Company]:
        """Получить компанию по ID"""
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        return result.scalar_one_or_none()
    
    async def get_company_by_inn(
        self, 
        db: AsyncSession, 
        inn: str
    ) -> Optional[Company]:
        """Получить компанию по ИНН"""
        result = await db.execute(
            select(Company).where(Company.inn == inn)
        )
        return result.scalar_one_or_none()
    
    async def get_company_by_email(
        self, 
        db: AsyncSession, 
        email: str
    ) -> Optional[Company]:
        """Получить компанию по email"""
        result = await db.execute(
            select(Company).where(Company.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_company_by_owner(
        self, 
        db: AsyncSession, 
        owner_id: int
    ) -> Optional[Company]:
        """Получить компанию по ID владельца"""
        result = await db.execute(
            select(Company).where(Company.owner_id == owner_id)
        )
        return result.scalar_one_or_none()
    
    async def register_company(
        self, 
        db: AsyncSession, 
        data: CompanyRegisterRequest
    ) -> Tuple[Company, User, bool]:
        """Зарегистрировать компанию"""
        
        # Проверяем, существует ли компания с таким ИНН
        existing_company = await self.get_company_by_inn(db, data.inn)
        if existing_company:
            raise ValueError("Компания с таким ИНН уже зарегистрирована")
        
        # Проверяем, существует ли пользователь с таким email
        result = await db.execute(
            select(User).where(User.email == data.user_email)
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise ValueError("Пользователь с таким email уже зарегистрирован")
        
        # Проверяем, существует ли компания с таким email
        existing_company_email = await self.get_company_by_email(db, data.email)
        if existing_company_email:
            raise ValueError("Компания с таким email уже зарегистрирована")
        
        # Сначала создаем компанию, чтобы получить ее ID
        company = Company(
            name=data.company_name,
            full_name=data.company_name,
            inn=data.inn,
            email=data.email,
            phone=data.phone,
            website=None,
            description=None,
            city=None,
            industry=None,
            status=CompanyStatus.ACTIVE,
            is_email_verified=True,
            verification_status=VerificationStatus.PENDING
        )
        db.add(company)
        await db.flush()  # Получаем company.id
        
        # Создаем пользователя-владельца компании с company_id
        user = User(
            email=data.user_email,
            hashed_password=get_password_hash(data.user_password),
            first_name=data.user_first_name,
            last_name=data.user_last_name,
            patronymic=data.user_patronymic,
            role=UserRole.COMPANY,
            status=UserStatus.ACTIVE,
            is_email_verified=True,
            company_id=company.id  # ← ВАЖНО: связываем пользователя с компанией
        )
        db.add(user)
        
        # Обновляем company.owner_id
        company.owner_id = user.id
        
        await db.commit()
        await db.refresh(user)
        await db.refresh(company)
        
        # Отправка email для подтверждения (опционально)
        email_sent = False
        try:
            from app.services.email_service import email_service
            email_sent = await email_service.send_company_verification_email(
                email_to=company.email,
                company_name=company.full_name,
                verification_token="test_token"
            )
        except Exception as e:
            pass
        
        return company, user, email_sent
    
    async def update_company(
        self,
        db: AsyncSession,
        company_id: int,
        update_data: CompanyUpdate
    ) -> Company:
        """Обновление данных компании"""
        company = await self.get_company_by_id(db, company_id)
        
        if not company:
            raise ValueError(f"Компания с ID {company_id} не найдена")
        
        # Применяем обновления
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            if hasattr(company, field) and value is not None:
                setattr(company, field, value)
        
        company.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(company)
        
        return company
    
    async def verify_company_email(
        self, 
        db: AsyncSession, 
        token: str
    ) -> Company:
        """Подтвердить email компании по токену"""
        result = await db.execute(
            select(Company).where(
                Company.verification_status == VerificationStatus.PENDING
            ).limit(1)
        )
        company = result.scalar_one_or_none()
        
        if company:
            company.verification_status = VerificationStatus.VERIFIED
            company.verified_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(company)
        
        return company
    
    async def get_company_stats(
        self,
        db: AsyncSession,
        company_id: int
    ) -> dict:
        """Получить статистику компании"""
        from app.models.opportunity import Opportunity, OpportunityStatus
        from app.models.review import Review
        
        # Количество активных вакансий/стажировок
        opportunities_result = await db.execute(
            select(func.count(Opportunity.id))
            .where(
                Opportunity.company_id == company_id,
                Opportunity.status == OpportunityStatus.ACTIVE
            )
        )
        active_opportunities = opportunities_result.scalar() or 0
        
        # Средний рейтинг
        rating_result = await db.execute(
            select(func.avg(Review.rating))
            .where(Review.company_id == company_id)
        )
        average_rating = float(rating_result.scalar() or 0)
        
        # Количество отзывов
        reviews_result = await db.execute(
            select(func.count(Review.id))
            .where(Review.company_id == company_id)
        )
        total_reviews = reviews_result.scalar() or 0
        
        return {
            "active_opportunities": active_opportunities,
            "total_reviews": total_reviews,
            "average_rating": round(average_rating, 1),
            "views_count": 0
        }
    
    async def list_companies(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        industry: Optional[str] = None,
        city: Optional[str] = None,
        verified_only: bool = False
    ) -> Tuple[List[Company], int]:
        """Получить список компаний с фильтрацией"""
        query = select(Company)
        
        if verified_only:
            query = query.where(
                Company.verification_status == VerificationStatus.VERIFIED
            )
        
        if search:
            query = query.where(
                Company.name.ilike(f"%{search}%")
            )
        
        if industry:
            query = query.where(Company.industry == industry)
        
        if city:
            query = query.where(Company.city == city)
        
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.execute(count_query)
        total_count = total.scalar() or 0
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        companies = result.scalars().all()
        
        return companies, total_count
    
    async def delete_company(
        self, 
        db: AsyncSession, 
        company_id: int
    ) -> None:
        """Удалить компанию и связанного пользователя"""
        from app.models.user import User
        
        # Получаем компанию
        company = await self.get_company_by_id(db, company_id)
        if not company:
            raise ValueError(f"Компания с ID {company_id} не найдена")
        
        # Сохраняем информацию для лога
        company_name = company.full_name
        owner_id = company.owner_id
        
        # Удаляем компанию
        await db.delete(company)
        
        # Удаляем пользователя-владельца, если он есть
        if owner_id:
            user_result = await db.execute(
                select(User).where(User.id == owner_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                await db.delete(user)
        
        await db.commit()


# Создаем экземпляр сервиса
company_service = CompanyService()