# backend/app/services/company_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, Tuple, List
from datetime import datetime, timezone
import logging
logger = logging.getLogger(__name__)
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
        """Зарегистрировать компанию и создать пользователя-владельца"""
     
        
        # Проверки
        existing_company = await self.get_company_by_inn(db, data.inn)
        if existing_company:
            raise ValueError("Компания с таким ИНН уже зарегистрирована")
        
        result = await db.execute(
            select(User).where(User.email == data.user_email)
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise ValueError("Пользователь с таким email уже зарегистрирован")
        
        existing_company_email = await self.get_company_by_email(db, data.email)
        if existing_company_email:
            raise ValueError("Компания с таким email уже зарегистрирована")
        
        # Генерируем токен
        import secrets
        verification_token = secrets.token_urlsafe(32)
        
        # Создаем компанию
        company = Company(
            name=data.company_name,
            full_name=data.company_name,
            inn=data.inn,
            email=data.email,
            phone=data.phone,
            status=CompanyStatus.PENDING_EMAIL,
            is_email_verified=False,
            verification_status=VerificationStatus.PENDING,
            email_verification_token=verification_token
        )
        db.add(company)
        await db.flush()
        
        # Создаем пользователя
        user = User(
            email=data.user_email,
            hashed_password=get_password_hash(data.user_password),
            first_name=data.user_first_name,
            last_name=data.user_last_name,
            patronymic=data.user_patronymic,
            role=UserRole.COMPANY,
            status=UserStatus.ACTIVE,
            is_email_verified=True,  # Пользователь сразу активен
            company_id=company.id  # Связь с компанией
        )
        db.add(user)
        await db.flush()
        
        # Связываем компанию с пользователем
        company.owner_id = user.id
        
        await db.commit()
        await db.refresh(company)
        await db.refresh(user)
        
        # Отправляем email
        email_sent = False
        try:
            from app.services.email_service import email_service
            email_sent = await email_service.send_company_verification_email(
                email_to=data.email,
                company_name=data.company_name,
                verification_token=verification_token
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
        """Подтвердить email компании по токену."""
        from app.models.company import CompanyStatus, VerificationStatus
        from datetime import datetime, timezone
        
        logger.info("=" * 60)
        logger.info(f"🔍 ВЕРИФИКАЦИЯ EMAIL")
        logger.info(f"   Токен: {token[:30]}..." if len(token) > 30 else f"   Токен: {token}")
        
        # Ищем компанию по токену
        result = await db.execute(
            select(Company).where(Company.email_verification_token == token)
        )
        company = result.scalar_one_or_none()
        
        if not company:
            # Проверим, есть ли вообще компании с токенами
            all_tokens = await db.execute(
                select(Company.id, Company.email_verification_token)
                .where(Company.email_verification_token.isnot(None))
            )
            tokens_list = all_tokens.all()
            logger.error(f"❌ Компания с токеном не найдена")
            logger.error(f"   Всего компаний с токенами: {len(tokens_list)}")
            for t in tokens_list[:5]:  # Показать первые 5
                logger.error(f"   - Company {t[0]}: {t[1][:30]}...")
            raise ValueError("Неверный или просроченный токен")
        
        logger.info(f"✅ Найдена компания:")
        logger.info(f"   ID: {company.id}")
        logger.info(f"   Название: {company.full_name}")
        logger.info(f"   Email: {company.email}")
        logger.info(f"   ДО ИЗМЕНЕНИЙ:")
        logger.info(f"     status: {company.status} (type: {type(company.status)})")
        logger.info(f"     is_email_verified: {company.is_email_verified}")
        logger.info(f"     verification_status: {company.verification_status}")
        logger.info(f"     email_verification_token: {company.email_verification_token[:20] if company.email_verification_token else None}...")
        
        # Проверяем, не подтверждён ли уже email
        if company.is_email_verified:
            logger.warning(f"⚠️ Email уже подтверждён для компании {company.id}")
            return company
        
        # ✅ ОБНОВЛЯЕМ ПОЛЯ
        logger.info("📝 Обновляем поля...")
        
        company.is_email_verified = True
        logger.info(f"   is_email_verified = True")
        
        company.status = CompanyStatus.PENDING_REVIEW
        logger.info(f"   status = {CompanyStatus.PENDING_REVIEW} (value: {CompanyStatus.PENDING_REVIEW.value})")
        
        company.verification_status = VerificationStatus.PENDING
        logger.info(f"   verification_status = {VerificationStatus.PENDING}")
        
        company.email_verification_token = None
        logger.info(f"   email_verification_token = None")
        
        company.email_verified_at = datetime.now(timezone.utc)
        logger.info(f"   email_verified_at = {company.email_verified_at}")
        
        # ✅ КОММИТ
        logger.info("💾 Выполняем commit...")
        try:
            await db.commit()
            logger.info("✅ Commit успешен")
        except Exception as e:
            logger.error(f"❌ Ошибка при commit: {str(e)}")
            await db.rollback()
            raise
        
        # ✅ REFRESH
        logger.info("🔄 Выполняем refresh...")
        await db.refresh(company)
        
        logger.info(f"✅ ПОСЛЕ ИЗМЕНЕНИЙ:")
        logger.info(f"   status: {company.status} (value: {company.status.value if hasattr(company.status, 'value') else company.status})")
        logger.info(f"   is_email_verified: {company.is_email_verified}")
        logger.info(f"   verification_status: {company.verification_status}")
        logger.info(f"   email_verification_token: {company.email_verification_token}")
        logger.info("=" * 60)
        
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
        """Удалить компанию и все связанные данные"""
        from app.models.user import User
        from app.models.opportunity import Opportunity
        from app.models.recommendation import Recommendation
        from app.models.review import Review
        from app.models.favorite import Favorite, FavoriteCompany
        
        # Получаем компанию
        company = await self.get_company_by_id(db, company_id)
        if not company:
            raise ValueError(f"Компания с ID {company_id} не найдена")
        
        # Сохраняем информацию для лога
        company_name = company.full_name
        owner_id = company.owner_id
        
        try:
            # 1. Сначала получаем все ID вакансий этой компании
            opportunities_result = await db.execute(
                select(Opportunity.id).where(Opportunity.company_id == company_id)
            )
            opportunity_ids = [row[0] for row in opportunities_result.fetchall()]
            
            # 2. Удаляем рекомендации для этих вакансий
            if opportunity_ids:
                await db.execute(
                    Recommendation.__table__.delete().where(
                        Recommendation.opportunity_id.in_(opportunity_ids)
                    )
                )
            
            # 3. Удаляем избранные вакансии (Favorites) для вакансий этой компании
            if opportunity_ids:
                await db.execute(
                    Favorite.__table__.delete().where(
                        Favorite.opportunity_id.in_(opportunity_ids)
                    )
                )
            
            # 4. Удаляем избранные компании (FavoriteCompany)
            await db.execute(
                FavoriteCompany.__table__.delete().where(
                    FavoriteCompany.company_id == company_id
                )
            )
            
            # 5. Удаляем все вакансии компании
            await db.execute(
                Opportunity.__table__.delete().where(Opportunity.company_id == company_id)
            )
            
            # 6. Удаляем отзывы о компании
            await db.execute(
                Review.__table__.delete().where(Review.company_id == company_id)
            )
            
            # 7. Обновляем пользователей, привязанных к этой компании
            await db.execute(
                User.__table__.update().where(
                    User.company_id == company_id
                ).values(company_id=None)
            )
            
            # 8. Удаляем компанию
            await db.execute(
                Company.__table__.delete().where(Company.id == company_id)
            )
            
            # 9. Удаляем пользователя-владельца, если он есть
            if owner_id:
                await db.execute(
                    User.__table__.delete().where(User.id == owner_id)
                )
            
            await db.commit()
            
            logger.info(f"Компания '{company_name}' (ID: {company_id}) успешно удалена со всеми связанными данными")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Ошибка при удалении компании {company_id}: {str(e)}")
            raise ValueError(f"Ошибка при удалении компании: {str(e)}")


# Создаем экземпляр сервиса
company_service = CompanyService()