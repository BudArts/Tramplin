# backend/app/routers/companies.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
# ❌ УДАЛЕНО: from app.services.company_service import company_service
from app.schemas.company import (
    CompanyResponse,
    CompanyListResponse,
    CompanyUpdate,
)
from app.schemas.auth import MessageResponse
from app.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus

router = APIRouter(prefix="/companies", tags=["Companies"])


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
    """Получение списка активных компаний."""
    query = select(Company).where(Company.status == CompanyStatus.ACTIVE)
    
    if industry:
        query = query.where(Company.industry.ilike(f"%{industry}%"))
    
    query = query.order_by(Company.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [CompanyListResponse.model_validate(c) for c in companies]


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
    """Получение списка компаний, ожидающих модерацию."""
    from app.services.company_service import company_service  # ← ИМПОРТ ВНУТРИ
    
    companies = await company_service.get_companies_for_moderation(db, skip, limit)
    return [CompanyResponse.model_validate(c) for c in companies]

@router.delete(
    "/{company_id}",
    response_model=MessageResponse,
    summary="Удалить компанию"
)
async def delete_company(
    company_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """Удаление компании (только для администраторов и кураторов)."""
    from app.services.company_service import company_service
    
    # Проверяем, существует ли компания
    company = await company_service.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    try:
        # Удаляем компанию и связанного пользователя
        await company_service.delete_company(db, company_id)
        return MessageResponse(
            message=f"Компания '{company.full_name}' успешно удалена",
            success=True,
            data={"company_id": company_id}
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении компании: {str(e)}"
        )

@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Детали компании"
)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получение детальной информации о компании."""
    from app.services.company_service import company_service  # ← ИМПОРТ ВНУТРИ
    
    company = await company_service.get_company_by_id(db, company_id)
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    return CompanyResponse.model_validate(company)


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
    """Обновление данных компании."""
    from app.services.company_service import company_service  # ← ИМПОРТ ВНУТРИ
    
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
    """Одобрение компании после модерации."""
    from app.services.company_service import company_service  # ← ИМПОРТ ВНУТРИ
    
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
# backend/app/routers/companies.py

@router.get(
    "/top-rated/",
    response_model=List[CompanyResponse],
    summary="Топ компаний по рейтингу"
)
async def get_top_rated_companies(
    limit: int = 3,
    db: AsyncSession = Depends(get_db)
):
    """Получение топ-компаний по рейтингу."""
    from app.models.company import Company, CompanyStatus
    from sqlalchemy import desc
    
    query = select(Company).where(
        Company.status == CompanyStatus.ACTIVE,
        Company.is_email_verified == True
    ).order_by(
        desc(Company.rating),
        desc(Company.reviews_count)
    ).limit(limit)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [CompanyResponse.model_validate(c) for c in companies]

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
    """Отклонение компании с указанием причины."""
    from app.services.company_service import company_service  # ← ИМПОРТ ВНУТРИ
    
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