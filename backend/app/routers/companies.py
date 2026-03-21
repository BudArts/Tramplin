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
from sqlalchemy import select, func
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

@router.get(
    "/{company_id}/stats",
    summary="Статистика компании",
)
async def get_company_stats(
    company_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Публичная статистика компании:
    - Количество вакансий
    - Количество откликов
    - Процент принятых
    - Средняя скорость ответа
    """
    from app.models.opportunity import Opportunity, OpportunityStatus
    from app.models.application import Application, ApplicationStatus

    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    # Количество активных вакансий
    active_count = await db.scalar(
        select(func.count(Opportunity.id)).where(
            Opportunity.company_id == company_id,
            Opportunity.status == OpportunityStatus.ACTIVE,
        )
    ) or 0

    # Всего вакансий
    total_opps = await db.scalar(
        select(func.count(Opportunity.id)).where(
            Opportunity.company_id == company_id,
        )
    ) or 0

    # Получаем ID всех вакансий компании
    opp_ids_result = await db.execute(
        select(Opportunity.id).where(Opportunity.company_id == company_id)
    )
    opp_ids = [row[0] for row in opp_ids_result.all()]

    total_applications = 0
    accepted_applications = 0
    rejected_applications = 0

    if opp_ids:
        total_applications = await db.scalar(
            select(func.count(Application.id)).where(
                Application.opportunity_id.in_(opp_ids)
            )
        ) or 0

        accepted_applications = await db.scalar(
            select(func.count(Application.id)).where(
                Application.opportunity_id.in_(opp_ids),
                Application.status == ApplicationStatus.ACCEPTED,
            )
        ) or 0

        rejected_applications = await db.scalar(
            select(func.count(Application.id)).where(
                Application.opportunity_id.in_(opp_ids),
                Application.status == ApplicationStatus.REJECTED,
            )
        ) or 0

    # Процент принятых
    reviewed = accepted_applications + rejected_applications
    acceptance_rate = round((accepted_applications / reviewed * 100), 1) if reviewed > 0 else None

    return {
        "company_id": company_id,
        "company_name": company.name,
        "active_opportunities": active_count,
        "total_opportunities": total_opps,
        "total_applications": total_applications,
        "accepted_applications": accepted_applications,
        "acceptance_rate": acceptance_rate,
        "trust_level": company.trust_level.value,
        "verification_status": company.verification_status.value,
    }