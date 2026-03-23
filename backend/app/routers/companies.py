# backend/app/routers/companies.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.services.company_service import company_service
from app.services.fns_service import fns_service
from app.schemas.company import (
    CompanyRegisterStep1,
    CompanyRegisterStep2,
    CompanyFNSData,
    CompanyResponse,
    CompanyListResponse,
    CompanyUpdate,
    CompanyEmailVerificationRequest
)
from app.schemas.auth import MessageResponse
from app.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.company import Company

router = APIRouter(prefix="/companies", tags=["Companies"])


# === Регистрация компании ===

@router.post(
    "/check-inn",
    response_model=CompanyFNSData,
    summary="Шаг 1: Проверка ИНН через ФНС"
)
async def check_company_inn(
    data: CompanyRegisterStep1,
    db: AsyncSession = Depends(get_db)
):
    """
    Проверка ИНН компании через API ФНС.
    
    Возвращает данные о компании из реестра:
    - Полное и сокращённое наименование
    - ОГРН, КПП
    - Юридический адрес
    - ФИО и должность руководителя
    - Статус компании
    
    Если компания уже зарегистрирована или ликвидирована - вернёт ошибку.
    """
    # Проверяем, не зарегистрирована ли уже компания
    existing = await company_service.get_company_by_inn(db, data.inn)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Компания с таким ИНН уже зарегистрирована на платформе"
        )
    
    try:
        fns_data = await company_service.check_inn(data.inn)
        return fns_data
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Шаг 2: Регистрация компании"
)
async def register_company(
    data: CompanyRegisterStep2,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация компании на платформе.
    
    Требуется:
    1. Предварительно проверить ИНН через /check-inn
    2. Указать корпоративную почту (бесплатные почтовые сервисы не принимаются)
    3. Данные администратора компании
    
    После регистрации:
    - На корпоративную почту будет отправлено письмо для подтверждения
    - На почту администратора будет отправлено письмо для активации аккаунта
    - После подтверждения обеих почт заявка будет направлена на модерацию
    """
    try:
        # Повторно получаем данные из ФНС
        fns_data = await company_service.check_inn(data.inn)
        
        company, user, email_sent = await company_service.register_company(
            db, data, fns_data
        )
        
        if email_sent:
            return MessageResponse(
                message="Заявка на регистрацию принята! "
                        "Проверьте корпоративную почту для подтверждения.",
                success=True
            )
        else:
            return MessageResponse(
                message="Заявка принята, но возникли проблемы с отправкой писем. "
                        "Свяжитесь с поддержкой.",
                success=True
            )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Подтверждение корпоративной почты"
)
async def verify_company_email(
    data: CompanyEmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждение корпоративной почты компании.
    
    После подтверждения заявка будет направлена на модерацию.
    """
    try:
        company = await company_service.verify_company_email(db, data.token)
        
        return MessageResponse(
            message="Корпоративная почта подтверждена! "
                    "Ваша заявка направлена на модерацию. "
                    "Мы уведомим вас о результате.",
            success=True
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# === Просмотр компаний ===

@router.get(
    "/",
    response_model=List[CompanyListResponse],
    summary="Список компаний"
)
async def get_companies(
    skip: int = 0,
    limit: int = 20,
    industry: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка активных компаний.
    
    Доступно всем пользователям.
    """
    from sqlalchemy import select
    from app.models.company import Company, CompanyStatus
    
    query = select(Company).where(Company.status == CompanyStatus.ACTIVE)
    
    if industry:
        query = query.where(Company.industry.ilike(f"%{industry}%"))
    
    query = query.order_by(Company.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [CompanyListResponse.model_validate(c) for c in companies]


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Детали компании"
)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Получение детальной информации о компании.
    """
    company = await company_service.get_company_by_id(db, company_id)
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    return CompanyResponse.model_validate(company)


# === Управление компанией ===

@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Обновление данных компании"
)
async def update_company(
    company_id: int,
    update_data: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление данных компании.
    
    Доступно только администраторам компании.
    """
    # Проверяем права
    if current_user.role not in [UserRole.ADMIN, UserRole.CURATOR]:
        if current_user.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет прав для редактирования этой компании"
            )
    
    try:
        company = await company_service.update_company(db, company_id, update_data)
        return CompanyResponse.model_validate(company)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# === Модерация (для админов и кураторов) ===

@router.get(
    "/moderation/pending",
    response_model=List[CompanyResponse],
    summary="Компании на модерации"
)
async def get_pending_companies(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка компаний, ожидающих модерацию.
    
    Доступно только администраторам и кураторам.
    """
    companies = await company_service.get_companies_for_moderation(db, skip, limit)
    return [CompanyResponse.model_validate(c) for c in companies]


@router.post(
    "/{company_id}/approve",
    response_model=MessageResponse,
    summary="Одобрить компанию"
)
async def approve_company(
    company_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """
    Одобрение компании после модерации.
    
    После одобрения компания становится активной и может публиковать вакансии.
    """
    try:
        await company_service.approve_company(db, company_id, current_user.id)
        
        return MessageResponse(
            message="Компания успешно одобрена и активирована",
            success=True
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{company_id}/reject",
    response_model=MessageResponse,
    summary="Отклонить компанию"
)
async def reject_company(
    company_id: int,
    reason: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """
    Отклонение компании с указанием причины.
    
    Компания получит уведомление с причиной отклонения.
    """
    if not reason or len(reason) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите причину отклонения (минимум 10 символов)"
        )
    
    try:
        await company_service.reject_company(db, company_id, reason, current_user.id)
        
        return MessageResponse(
            message="Компания отклонена, уведомление отправлено",
            success=True
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )