# backend/app/services/company_service.py
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets

from app.models.company import Company, CompanyStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.company import (
    CompanyRegisterStep1,
    CompanyRegisterStep2,
    CompanyCreate,
    CompanyUpdate,
    CompanyFNSData
)
from app.services.fns_service import fns_service
from app.services.email_service import email_service
from app.services.auth_service import AuthService
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class CompanyService:
    
    async def check_inn(self, inn: str) -> CompanyFNSData:
        """
        Шаг 1: Проверка ИНН через ФНС API
        """
        # Валидация ИНН
        if not fns_service.validate_inn(inn):
            raise ValueError("Некорректный ИНН. Проверьте правильность ввода.")
        
        # Проверяем, не зарегистрирована ли уже компания
        # (это будет проверено в роутере с доступом к БД)
        
        # Запрашиваем данные из ФНС
        fns_data = await fns_service.get_company_by_inn(inn)
        
        if not fns_data:
            # Пробуем через DaData
            fns_data = await fns_service.get_company_by_inn_dadata(inn)
        
        if not fns_data:
            raise ValueError(
                "Компания с таким ИНН не найдена в реестре ФНС. "
                "Проверьте правильность ИНН или попробуйте позже."
            )
        
        # Проверяем статус компании
        if fns_data.status.lower() in ["ликвидировано", "liquidated"]:
            raise ValueError("Компания ликвидирована и не может быть зарегистрирована.")
        
        return fns_data
    
    async def register_company(
        self,
        db: AsyncSession,
        step2_data: CompanyRegisterStep2,
        fns_data: CompanyFNSData
    ) -> Tuple[Company, User, bool]:
        """
        Шаг 2: Регистрация компании и пользователя-администратора
        Returns: (company, user, email_sent)
        """
        # Проверяем, не зарегистрирована ли компания
        existing_company = await db.execute(
            select(Company).where(Company.inn == step2_data.inn)
        )
        if existing_company.scalar_one_or_none():
            raise ValueError("Компания с таким ИНН уже зарегистрирована")
        
        # Проверяем, не занят ли email пользователя
        existing_user = await db.execute(
            select(User).where(User.email == step2_data.user_email)
        )
        if existing_user.scalar_one_or_none():
            raise ValueError("Пользователь с таким email уже существует")
        
        # Создаём компанию
        company_verification_token = secrets.token_urlsafe(32)
        
        company = Company(
            inn=fns_data.inn,
            ogrn=fns_data.ogrn,
            kpp=fns_data.kpp,
            full_name=fns_data.full_name,
            short_name=fns_data.short_name,
            legal_address=fns_data.legal_address,
            director_name=fns_data.director_name,
            director_position=fns_data.director_position,
            email=step2_data.email,
            phone=step2_data.phone,
            website=step2_data.website,
            status=CompanyStatus.PENDING_EMAIL,
            is_email_verified=False,
            email_verification_token=company_verification_token,
            email_verification_sent_at=datetime.utcnow(),
            fns_data=fns_data.raw_data,
            fns_updated_at=datetime.utcnow()
        )
        
        db.add(company)
        await db.flush()  # Получаем ID компании
        
        # Создаём пользователя-администратора компании
        user_verification_token = secrets.token_urlsafe(32)
        
        user = User(
            email=step2_data.user_email,
            hashed_password=AuthService.hash_password(step2_data.user_password),
            first_name=step2_data.user_first_name,
            last_name=step2_data.user_last_name,
            patronymic=step2_data.user_patronymic,
            role=UserRole.COMPANY,
            status=UserStatus.PENDING,
            is_email_verified=False,
            email_verification_token=user_verification_token,
            email_verification_sent_at=datetime.utcnow(),
            company_id=company.id
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(company)
        await db.refresh(user)
        
        # Отправляем email для подтверждения корпоративной почты компании
        company_email_sent = await email_service.send_company_verification_email(
            email_to=company.email,
            company_name=company.full_name,
            verification_token=company_verification_token
        )
        
        # Отправляем email для подтверждения почты пользователя
        user_email_sent = await email_service.send_verification_email(
            email_to=user.email,
            first_name=user.first_name,
            verification_token=user_verification_token
        )
        
        logger.info(
            f"Company registered: {company.inn}, "
            f"company email sent: {company_email_sent}, "
            f"user email sent: {user_email_sent}"
        )
        
        return company, user, company_email_sent and user_email_sent
    
    async def verify_company_email(
        self,
        db: AsyncSession,
        token: str
    ) -> Company:
        """Подтверждение корпоративной почты компании"""
        result = await db.execute(
            select(Company).where(Company.email_verification_token == token)
        )
        company = result.scalar_one_or_none()
        
        if not company:
            raise ValueError("Невалидный токен верификации")
        
        # Проверяем срок действия
        if company.email_verification_sent_at:
            expires_at = company.email_verification_sent_at + timedelta(
                hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
            )
            if datetime.utcnow() > expires_at:
                raise ValueError("Срок действия ссылки истёк. Запросите новую.")
        
        # Подтверждаем email
        company.is_email_verified = True
        company.email_verified_at = datetime.utcnow()
        company.email_verification_token = None
        company.status = CompanyStatus.PENDING_REVIEW  # Переводим на модерацию
        
        await db.commit()
        await db.refresh(company)
        
        logger.info(f"Company email verified: {company.inn}, status: pending_review")
        
        return company
    
    async def resend_company_verification(
        self,
        db: AsyncSession,
        company_id: int
    ) -> bool:
        """Повторная отправка письма подтверждения для компании"""
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        
        if not company:
            raise ValueError("Компания не найдена")
        
        if company.is_email_verified:
            raise ValueError("Email компании уже подтверждён")
        
        # Генерируем новый токен
        verification_token = secrets.token_urlsafe(32)
        company.email_verification_token = verification_token
        company.email_verification_sent_at = datetime.utcnow()
        
        await db.commit()
        
        return await email_service.send_company_verification_email(
            email_to=company.email,
            company_name=company.full_name,
            verification_token=verification_token
        )
    
    async def approve_company(
        self,
        db: AsyncSession,
        company_id: int,
        moderator_id: int
    ) -> Company:
        """Одобрение компании модератором"""
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        
        if not company:
            raise ValueError("Компания не найдена")
        
        if company.status != CompanyStatus.PENDING_REVIEW:
            raise ValueError(f"Компания не на модерации. Текущий статус: {company.status}")
        
        company.status = CompanyStatus.ACTIVE
        company.verified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(company)
        
        # Уведомляем компанию
        await email_service.send_company_approved_email(
            email_to=company.email,
            company_name=company.full_name
        )
        
        logger.info(f"Company approved: {company.inn} by moderator {moderator_id}")
        
        return company
    
    async def reject_company(
        self,
        db: AsyncSession,
        company_id: int,
        reason: str,
        moderator_id: int
    ) -> Company:
        """Отклонение компании модератором"""
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        
        if not company:
            raise ValueError("Компания не найдена")
        
        company.status = CompanyStatus.REJECTED
        company.rejection_reason = reason
        
        await db.commit()
        await db.refresh(company)
        
        # Уведомляем компанию
        await email_service.send_company_rejected_email(
            email_to=company.email,
            company_name=company.full_name,
            reason=reason
        )
        
        logger.info(f"Company rejected: {company.inn} by moderator {moderator_id}")
        
        return company
    
    async def get_company_by_id(
        self,
        db: AsyncSession,
        company_id: int
    ) -> Optional[Company]:
        """Получение компании по ID"""
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        return result.scalar_one_or_none()
    
    async def get_company_by_inn(
        self,
        db: AsyncSession,
        inn: str
    ) -> Optional[Company]:
        """Получение компании по ИНН"""
        result = await db.execute(
            select(Company).where(Company.inn == inn)
        )
        return result.scalar_one_or_none()
    
    async def get_companies_for_moderation(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20
    ) -> List[Company]:
        """Получение компаний на модерацию"""
        result = await db.execute(
            select(Company)
            .where(Company.status == CompanyStatus.PENDING_REVIEW)
            .order_by(Company.created_at)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def update_company(
        self,
        db: AsyncSession,
        company_id: int,
        update_data: CompanyUpdate
    ) -> Company:
        """Обновление данных компании"""
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        
        if not company:
            raise ValueError("Компания не найдена")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(company, field, value)
        
        await db.commit()
        await db.refresh(company)
        
        return company


# Singleton
company_service = CompanyService()