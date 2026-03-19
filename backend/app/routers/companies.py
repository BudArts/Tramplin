from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional, require_role
from app.models.user import User, UserRole
from app.models.company import Company, VerificationStatus
from app.schemas.company import (
    CompanyResponse,
    CompanyShort,
    CompanyUpdate,
    CompanyDetailResponse,
    VerificationRequest,
)
from app.schemas.common import MessageResponse
from app.utils.validators import validate_inn, check_corporate_email

router = APIRouter(prefix="/api/companies", tags=["Компании"])


@router.get(
    "",
    response_model=list[CompanyShort],
    summary="Список компаний",
)
async def list_companies(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    verified_only: bool = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Публичный список компаний с фильтрацией."""
    query = select(Company)

    if verified_only:
        query = query.where(Company.verification_status == VerificationStatus.VERIFIED)

    if search:
        query = query.where(Company.name.ilike(f"%{search}%"))

    if industry:
        query = query.where(Company.industry.ilike(f"%{industry}%"))

    if city:
        query = query.where(Company.city.ilike(f"%{city}%"))

    query = query.order_by(Company.name).offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    companies = result.scalars().all()
    return companies


@router.get(
    "/me",
    response_model=CompanyDetailResponse,
    summary="Моя компания",
)
async def get_my_company(
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает компанию текущего работодателя."""
    result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    return company


@router.put(
    "/me",
    response_model=CompanyResponse,
    summary="Обновить компанию",
)
async def update_my_company(
    data: CompanyUpdate,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """Обновление профиля компании работодателем."""
    result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(company, field, value)

    await db.commit()
    await db.refresh(company)
    return company


@router.post(
    "/me/verify",
    response_model=MessageResponse,
    summary="Запрос на верификацию",
)
async def request_verification(
    data: VerificationRequest,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Запрос на верификацию компании.

    Шаг 1: Проверка ИНН (автоматическая)
    Шаг 2: Проверка корпоративной почты (если указана)
    Шаг 3: Заявка отправляется куратору на ручную проверку
    """
    result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    if company.verification_status == VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Компания уже верифицирована",
        )

    # Шаг 1: Валидация ИНН
    if not validate_inn(data.inn):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невалидный ИНН. Проверьте правильность ввода",
        )

    company.inn = data.inn

    # Шаг 2: Проверка корп. почты (если указана)
    if data.corporate_email and data.website:
        is_corporate = check_corporate_email(data.corporate_email, data.website)
        if is_corporate:
            company.verification_status = VerificationStatus.EMAIL_CONFIRMED
            company.corporate_email = data.corporate_email
        else:
            company.verification_status = VerificationStatus.INN_VERIFIED
    else:
        company.verification_status = VerificationStatus.INN_VERIFIED

    if data.website:
        company.website = data.website

    if data.comment:
        company.verification_comment = data.comment

    await db.commit()

    return MessageResponse(
        message="Заявка на верификацию отправлена. Ожидайте подтверждения куратором"
    )


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Профиль компании",
)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Публичный профиль компании."""
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    return company