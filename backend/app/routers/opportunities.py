# backend/app/routers/opportunities.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload  # ← ДОБАВЛЯЕМ ЭТОТ ИМПОРТ
from typing import Optional, List
from datetime import datetime, timezone

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional, require_role
from app.models.user import User, UserRole
from app.models.company import Company, VerificationStatus
from app.models.opportunity import Opportunity, OpportunityStatus, ModerationStatus
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityListResponse,
    StatusUpdate,
    MapPointResponse,
)
from app.schemas.common import MessageResponse
from app.services.opportunity_service import opportunity_service

router = APIRouter(prefix="/api/opportunities", tags=["Возможности"])


@router.get(
    "",
    response_model=OpportunityListResponse,
    summary="Список возможностей"
)
async def list_opportunities(
    search: Optional[str] = None,
    type: Optional[str] = None,
    work_format: Optional[str] = None,
    tags: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    city: Optional[str] = None,
    company_id: Optional[int] = None,
    sort: str = Query("published_at", pattern="^(published_at|salary_min|salary_max|created_at|views_count)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Список активных возможностей с фильтрацией и пагинацией."""
    skip = (page - 1) * per_page
    
    opportunities, total = await opportunity_service.get_opportunities_list(
        db=db,
        skip=skip,
        limit=per_page,
        search=search,
        type_filter=type,
        work_format=work_format,
        city=city,
        company_id=company_id,
        sort=sort,
        order=order
    )
    
    # Если указаны теги, фильтруем по ним
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        filtered = []
        for opp in opportunities:
            opp_tags = [tag.name for tag in opp.tags]
            if any(t in opp_tags for t in tag_list):
                filtered.append(opp)
        opportunities = filtered
        total = len(filtered)
    
    return OpportunityListResponse(
        items=opportunities,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total > 0 else 1
    )


@router.get(
    "/map",
    response_model=List[MapPointResponse],
    summary="Маркеры для карты"
)
async def get_map_points(
    type: Optional[str] = None,
    work_format: Optional[str] = None,
    tags: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    city: Optional[str] = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Лёгкий эндпоинт для карты — возвращает только координаты, тип, название."""
    
    # ✅ ИСПРАВЛЕНО: Добавляем selectinload
    query = (
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),      # ✅
            selectinload(Opportunity.company),   # ✅
        )
        .where(
            Opportunity.status == OpportunityStatus.ACTIVE,
            Opportunity.moderation_status == ModerationStatus.APPROVED,
            Opportunity.latitude.isnot(None),
            Opportunity.longitude.isnot(None)
        )
    )
    
    if type:
        query = query.where(Opportunity.type == type)
    if work_format:
        query = query.where(Opportunity.work_format == work_format)
    if city:
        query = query.where(Opportunity.city == city)
    if salary_min:
        query = query.where(Opportunity.salary_max >= salary_min)
    if salary_max:
        query = query.where(Opportunity.salary_min <= salary_max)
    
    result = await db.execute(query)
    opportunities = result.scalars().unique().all()  # ✅ unique()
    
    # Фильтрация по тегам
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        filtered = []
        for opp in opportunities:
            opp_tags = [tag.name for tag in opp.tags]
            if any(t in opp_tags for t in tag_list):
                filtered.append(opp)
        opportunities = filtered
    
    # Получаем ID избранных компаний для текущего пользователя
    favorite_company_ids = set()
    if current_user and current_user.id:
        from app.models.favorite import Favorite
        fav_result = await db.execute(
            select(Favorite.company_id).where(Favorite.user_id == current_user.id)
        )
        favorite_company_ids = {row[0] for row in fav_result.all()}
    
    points = []
    for opp in opportunities:
        points.append(MapPointResponse(
            id=opp.id,
            title=opp.title,
            type=opp.type,
            latitude=opp.latitude,
            longitude=opp.longitude,
            company_id=opp.company_id,
            company_name=opp.company.name if opp.company else None,
            salary_min=opp.salary_min,
            salary_max=opp.salary_max,
            top_tags=[tag.name for tag in opp.tags[:3]],
            is_favorite_company=opp.company_id in favorite_company_ids
        ))
    
    return points


@router.get(
    "/my",
    response_model=List[OpportunityResponse],
    summary="Мои возможности"
)
async def get_my_opportunities(
    opportunity_status: Optional[str] = None,
    current_user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db)
):
    """Список возможностей текущего работодателя."""
    
    # Получаем компанию пользователя
    result = await db.execute(
        select(Company).where(Company.owner_id == current_user.id)
    )
    company = result.scalar_one_or_none()
    
    # ✅ ДОБАВЛЕНО: Если нет компании по owner_id, проверяем company_id пользователя
    if not company and current_user.company_id:
        result = await db.execute(
            select(Company).where(Company.id == current_user.company_id)
        )
        company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    # ✅ ИСПРАВЛЕНО: Добавляем selectinload для tags и company
    query = (
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),      # ✅ Подгружаем теги
            selectinload(Opportunity.company),   # ✅ Подгружаем компанию
        )
        .where(Opportunity.company_id == company.id)
    )
    
    if opportunity_status:
        query = query.where(Opportunity.status == opportunity_status)
    
    query = query.order_by(Opportunity.created_at.desc())
    
    result = await db.execute(query)
    opportunities = result.scalars().unique().all()  # ✅ unique() для избежания дублей
    
    return opportunities

@router.get(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Детальная карточка возможности"
)
async def get_opportunity(
    opportunity_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Полная карточка возможности. Доступна без авторизации."""
    opportunity = await opportunity_service.get_opportunity_by_id(db, opportunity_id)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена"
        )
    
    return opportunity


@router.post(
    "/{opportunity_id}/view",
    response_model=MessageResponse,
    summary="Увеличить счетчик просмотров"
)
async def increment_view(
    opportunity_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Увеличить счетчик просмотров возможности."""
    await opportunity_service.increment_views(db, opportunity_id)
    return MessageResponse(message="OK")


@router.post(
    "",
    response_model=OpportunityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать возможность"
)
async def create_opportunity(
    data: OpportunityCreate,
    current_user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db)
):
    """Создание новой вакансии/стажировки/мероприятия/менторской программы."""
    
    # СПОСОБ 1: Получаем компанию через company_id пользователя
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена. Ваш аккаунт не привязан к компании."
        )
    
    # Получаем компанию по ID из профиля пользователя
    result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    # Проверка верификации компании
    if company.verification_status != VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только верифицированные компании могут создавать возможности"
        )
    
    try:
        opportunity = await opportunity_service.create_opportunity(
            db, data, current_user.id, company.id
        )
        return opportunity
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Редактировать возможность"
)
async def update_opportunity(
    opportunity_id: int,
    data: OpportunityUpdate,
    current_user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db)
):
    """Редактирование возможности её владельцем."""
    # Получаем возможность
    opportunity = await opportunity_service.get_opportunity_by_id(db, opportunity_id)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена"
        )
    
    # Получаем компанию пользователя
    result = await db.execute(
        select(Company).where(Company.owner_id == current_user.id)
    )
    company = result.scalar_one_or_none()
    
    if not company or opportunity.company_id != company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для редактирования этой возможности"
        )
    
    try:
        updated = await opportunity_service.update_opportunity(db, opportunity_id, data, current_user.id)
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{opportunity_id}",
    response_model=MessageResponse,
    summary="Удалить возможность"
)
async def delete_opportunity(
    opportunity_id: int,
    current_user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db)
):
    """Мягкое удаление (закрытие) возможности."""
    # Получаем возможность
    opportunity = await opportunity_service.get_opportunity_by_id(db, opportunity_id)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена"
        )
    
    # Получаем компанию пользователя
    result = await db.execute(
        select(Company).where(Company.owner_id == current_user.id)
    )
    company = result.scalar_one_or_none()
    
    if not company or opportunity.company_id != company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для удаления этой возможности"
        )
    
    await opportunity_service.delete_opportunity(db, opportunity_id)
    return MessageResponse(message="Возможность закрыта")


@router.patch(
    "/{opportunity_id}/status",
    response_model=OpportunityResponse,
    summary="Сменить статус возможности"
)
async def change_opportunity_status(
    opportunity_id: int,
    data: StatusUpdate,
    current_user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db)
):
    """Закрыть, активировать или запланировать возможность."""
    # Получаем возможность
    opportunity = await opportunity_service.get_opportunity_by_id(db, opportunity_id)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена"
        )
    
    # Получаем компанию пользователя
    result = await db.execute(
        select(Company).where(Company.owner_id == current_user.id)
    )
    company = result.scalar_one_or_none()
    
    if not company or opportunity.company_id != company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для изменения статуса этой возможности"
        )
    
    try:
        updated = await opportunity_service.update_status(db, opportunity_id, data.status)
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )