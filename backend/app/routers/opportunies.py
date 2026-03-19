from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from geoalchemy2.functions import ST_DWithin, ST_MakePoint
from typing import Optional
from app.database import get_db
from app.models.opportunity import (
    Opportunity, OpportunityType, WorkFormat, OpportunityStatus
)
from app.models.tag import opportunity_tags
from app.models.favorite import Favorite
from app.dependencies import (
    get_current_user, get_current_user_optional, require_role
)
from app.models.user import User, UserRole
from app.schemas.opportunity import (
    OpportunityListResponse,
    OpportunityDetailResponse,
    OpportunityCreateRequest,
    MapPointResponse,
)

router = APIRouter(prefix="/api/opportunities", tags=["Opportunities"])


@router.get("", response_model=OpportunityListResponse)
async def list_opportunities(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    search: Optional[str] = None,
    type: Optional[str] = None,           # "internship,vacancy"
    work_format: Optional[str] = None,
    tags: Optional[str] = None,           # "1,5,12"
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[int] = Query(None, description="Радиус в км"),
    sort: str = "published_at",
    order: str = "desc",
    page: int = 1,
    per_page: int = 20,
):
    query = select(Opportunity).where(
        Opportunity.status == OpportunityStatus.ACTIVE
    )

    # Полнотекстовый поиск
    if search:
        query = query.where(
            or_(
                Opportunity.title.ilike(f"%{search}%"),
                Opportunity.description.ilike(f"%{search}%"),
            )
        )

    # Фильтр по типу
    if type:
        types = [OpportunityType(t) for t in type.split(",")]
        query = query.where(Opportunity.type.in_(types))

    # Фильтр по формату
    if work_format:
        formats = [WorkFormat(f) for f in work_format.split(",")]
        query = query.where(Opportunity.work_format.in_(formats))

    # Фильтр по тегам
    if tags:
        tag_ids = [int(t) for t in tags.split(",")]
        query = query.join(opportunity_tags).where(
            opportunity_tags.c.tag_id.in_(tag_ids)
        )

    # Фильтр по зарплате
    if salary_min:
        query = query.where(
            or_(
                Opportunity.salary_max >= salary_min,
                Opportunity.salary_max.is_(None)
            )
        )
    if salary_max:
        query = query.where(
            or_(
                Opportunity.salary_min <= salary_max,
                Opportunity.salary_min.is_(None)
            )
        )

    # Фильтр по городу
    if city:
        query = query.where(Opportunity.city.ilike(f"%{city}%"))

    # Гео-поиск (PostGIS)
    if lat and lng and radius:
        point = func.ST_SetSRID(
            ST_MakePoint(lng, lat), 4326
        )
        query = query.where(
            ST_DWithin(
                Opportunity.location,
                func.ST_Geography(point),
                radius * 1000  # км → метры
            )
        )

    # Подсчёт общего количества
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Сортировка
    sort_column = getattr(Opportunity, sort, Opportunity.published_at)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Пагинация
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    opportunities = result.scalars().all()

    return OpportunityListResponse(
        items=opportunities,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/map", response_model=list[MapPointResponse])
async def map_points(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    # те же фильтры что и выше, но возвращаем только координаты
    type: Optional[str] = None,
    work_format: Optional[str] = None,
    tags: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    city: Optional[str] = None,
):
    """Лёгкий эндпоинт для карты — только id, координаты, тип, title"""
    query = select(
        Opportunity.id,
        Opportunity.title,
        Opportunity.type,
        Opportunity.latitude,
        Opportunity.longitude,
        Opportunity.company_id,
        Opportunity.salary_min,
        Opportunity.salary_max,
    ).where(
        and_(
            Opportunity.status == OpportunityStatus.ACTIVE,
            Opportunity.latitude.isnot(None),
        )
    )

    # ...применяем те же фильтры...

    result = await db.execute(query)
    rows = result.all()

    # Если пользователь авторизован — проверяем избранные компании
    favorite_company_ids = set()
    if user:
        fav_result = await db.execute(
            select(Favorite.company_id).where(
                and_(
                    Favorite.user_id == user.id,
                    Favorite.company_id.isnot(None)
                )
            )
        )
        favorite_company_ids = {
            r[0] for r in fav_result.all()
        }

    return [
        MapPointResponse(
            id=row.id,
            title=row.title,
            type=row.type,
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            salary_min=row.salary_min,
            salary_max=row.salary_max,
            is_favorite_company=row.company_id in favorite_company_ids,
        )
        for row in rows
    ]