from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional, require_role
from app.models.user import User, UserRole
from app.models.company import Company, VerificationStatus, TrustLevel
from app.models.opportunity import (
    Opportunity, OpportunityType, WorkFormat, OpportunityStatus, ModerationStatus,
)
from app.models.tag import Tag, opportunity_tags
from app.models.favorite import FavoriteCompany
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityListResponse,
    MapPointResponse,
    StatusUpdate,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/opportunities", tags=["Возможности"])


# === Публичные эндпоинты ===

@router.get(
    "",
    response_model=OpportunityListResponse,
    summary="Список возможностей",
)
async def list_opportunities(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    search: Optional[str] = None,
    type: Optional[str] = None,
    work_format: Optional[str] = None,
    tags: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    city: Optional[str] = None,
    company_id: Optional[int] = None,
    sort: str = Query("published_at", regex="^(published_at|salary_min|salary_max|created_at|views_count)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """
    Список активных возможностей с фильтрацией и пагинацией.
    Доступен без авторизации.
    """
    query = (
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(Opportunity.status == OpportunityStatus.ACTIVE)
        .where(Opportunity.moderation_status == ModerationStatus.APPROVED)
    )

    # Полнотекстовый поиск
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Opportunity.title.ilike(search_filter),
                Opportunity.description.ilike(search_filter),
            )
        )

    # Фильтр по типу (можно несколько через запятую)
    if type:
        types = [OpportunityType(t.strip()) for t in type.split(",")]
        query = query.where(Opportunity.type.in_(types))

    # Фильтр по формату работы
    if work_format:
        formats = [WorkFormat(f.strip()) for f in work_format.split(",")]
        query = query.where(Opportunity.work_format.in_(formats))

    # Фильтр по тегам
    if tags:
        tag_ids = [int(t.strip()) for t in tags.split(",")]
        for tag_id in tag_ids:
            query = query.where(
                Opportunity.id.in_(
                    select(opportunity_tags.c.opportunity_id).where(
                        opportunity_tags.c.tag_id == tag_id
                    )
                )
            )

    # Фильтр по зарплате
    if salary_min is not None:
        query = query.where(
            or_(
                Opportunity.salary_max >= salary_min,
                Opportunity.salary_max.is_(None),
            )
        )

    if salary_max is not None:
        query = query.where(
            or_(
                Opportunity.salary_min <= salary_max,
                Opportunity.salary_min.is_(None),
            )
        )

    # Фильтр по городу
    if city:
        query = query.where(Opportunity.city.ilike(f"%{city}%"))

    # Фильтр по компании
    if company_id:
        query = query.where(Opportunity.company_id == company_id)

    # Считаем общее количество
    count_query = select(func.count()).select_from(
        select(Opportunity.id)
        .where(Opportunity.status == OpportunityStatus.ACTIVE)
        .where(Opportunity.moderation_status == ModerationStatus.APPROVED)
    )

    # Применяем те же фильтры для подсчёта
    count_base = (
        select(Opportunity.id)
        .where(Opportunity.status == OpportunityStatus.ACTIVE)
        .where(Opportunity.moderation_status == ModerationStatus.APPROVED)
    )
    if search:
        count_base = count_base.where(
            or_(
                Opportunity.title.ilike(f"%{search}%"),
                Opportunity.description.ilike(f"%{search}%"),
            )
        )
    if type:
        count_base = count_base.where(Opportunity.type.in_(types))
    if work_format:
        count_base = count_base.where(Opportunity.work_format.in_(formats))
    if city:
        count_base = count_base.where(Opportunity.city.ilike(f"%{city}%"))
    if company_id:
        count_base = count_base.where(Opportunity.company_id == company_id)

    total_result = await db.execute(
        select(func.count()).select_from(count_base.subquery())
    )
    total = total_result.scalar() or 0

    # Сортировка
    sort_column = getattr(Opportunity, sort, Opportunity.published_at)
    if order == "desc":
        query = query.order_by(sort_column.desc().nullslast())
    else:
        query = query.order_by(sort_column.asc().nullsfirst())

    # Пагинация
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    opportunities = result.unique().scalars().all()

    return OpportunityListResponse(
        items=opportunities,
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page),
    )


@router.get(
    "/map",
    response_model=list[MapPointResponse],
    summary="Маркеры для карты",
)
async def get_map_points(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    type: Optional[str] = None,
    work_format: Optional[str] = None,
    tags: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    city: Optional[str] = None,
):
    """
    Лёгкий эндпоинт для карты — возвращает только координаты, тип, название.
    Доступен без авторизации.
    """
    query = (
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(
            Opportunity.status == OpportunityStatus.ACTIVE,
            Opportunity.moderation_status == ModerationStatus.APPROVED,
            Opportunity.latitude.isnot(None),
            Opportunity.longitude.isnot(None),
        )
    )

    if type:
        types = [OpportunityType(t.strip()) for t in type.split(",")]
        query = query.where(Opportunity.type.in_(types))

    if work_format:
        formats = [WorkFormat(f.strip()) for f in work_format.split(",")]
        query = query.where(Opportunity.work_format.in_(formats))

    if tags:
        tag_ids = [int(t.strip()) for t in tags.split(",")]
        for tag_id in tag_ids:
            query = query.where(
                Opportunity.id.in_(
                    select(opportunity_tags.c.opportunity_id).where(
                        opportunity_tags.c.tag_id == tag_id
                    )
                )
            )

    if salary_min is not None:
        query = query.where(
            or_(Opportunity.salary_max >= salary_min, Opportunity.salary_max.is_(None))
        )

    if salary_max is not None:
        query = query.where(
            or_(Opportunity.salary_min <= salary_max, Opportunity.salary_min.is_(None))
        )

    if city:
        query = query.where(Opportunity.city.ilike(f"%{city}%"))

    result = await db.execute(query)
    opportunities = result.unique().scalars().all()

    # Получаем избранные компании если пользователь авторизован
    favorite_company_ids = set()
    if user:
        fav_result = await db.execute(
            select(FavoriteCompany.company_id).where(
                FavoriteCompany.user_id == user.id
            )
        )
        favorite_company_ids = {row[0] for row in fav_result.all()}

    points = []
    for opp in opportunities:
        top_tags = [tag.name for tag in opp.tags[:3]] if opp.tags else []
        company_name = opp.company.name if opp.company else None

        points.append(MapPointResponse(
            id=opp.id,
            title=opp.title,
            type=opp.type,
            latitude=float(opp.latitude),
            longitude=float(opp.longitude),
            company_id=opp.company_id,
            company_name=company_name,
            salary_min=opp.salary_min,
            salary_max=opp.salary_max,
            top_tags=top_tags,
            is_favorite_company=opp.company_id in favorite_company_ids,
        ))

    return points


@router.get(
    "/my",
    response_model=list[OpportunityResponse],
    summary="Мои возможности",
)
async def get_my_opportunities(
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """Список возможностей текущего работодателя."""
    # Получаем компанию
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    query = (
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(Opportunity.company_id == company.id)
    )

    if status_filter:
        statuses = [OpportunityStatus(s.strip()) for s in status_filter.split(",")]
        query = query.where(Opportunity.status.in_(statuses))

    query = query.order_by(Opportunity.created_at.desc())

    result = await db.execute(query)
    opportunities = result.unique().scalars().all()
    return opportunities


# === CRUD для работодателя ===

@router.post(
    "",
    response_model=OpportunityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать возможность",
)
async def create_opportunity(
    data: OpportunityCreate,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Создание новой вакансии/стажировки/мероприятия/менторской программы.
    Доступно только верифицированным работодателям.
    """
    # Проверяем компанию
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    if company.verification_status != VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Компания не верифицирована. Пройдите верификацию для создания возможностей",
        )

    # Определяем статус модерации в зависимости от trust level
    if company.trust_level == TrustLevel.PREMIUM:
        moderation = ModerationStatus.APPROVED
        opp_status = OpportunityStatus.ACTIVE
        published = datetime.now(timezone.utc)
    elif company.trust_level == TrustLevel.TRUSTED:
        moderation = ModerationStatus.APPROVED
        opp_status = OpportunityStatus.ACTIVE
        published = datetime.now(timezone.utc)
    else:
        moderation = ModerationStatus.PENDING
        opp_status = OpportunityStatus.PENDING_MODERATION
        published = None

    # Создаём возможность
    opportunity = Opportunity(
        company_id=company.id,
        title=data.title.strip(),
        description=data.description.strip(),
        type=data.type,
        work_format=data.work_format,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        address=data.address,
        city=data.city.strip(),
        latitude=data.latitude,
        longitude=data.longitude,
        expires_at=data.expires_at,
        event_date=data.event_date,
        media_urls=data.media_urls,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        external_url=data.external_url,
        status=opp_status,
        moderation_status=moderation,
        published_at=published,
    )
    db.add(opportunity)
    await db.flush()

    # Привязываем теги
    if data.tag_ids:
        tag_result = await db.execute(
            select(Tag).where(
                Tag.id.in_(data.tag_ids),
                Tag.is_approved == True,
            )
        )
        tags_list = tag_result.scalars().all()
        opportunity.tags = list(tags_list)

        # Увеличиваем usage_count тегов
        for tag in tags_list:
            tag.usage_count += 1

    await db.commit()

    # Перезагружаем с relationships
    result = await db.execute(
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(Opportunity.id == opportunity.id)
    )
    opportunity = result.unique().scalar_one()

    return opportunity


@router.get(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Детальная карточка возможности",
)
async def get_opportunity(
    opportunity_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Полная карточка возможности. Доступна без авторизации."""
    result = await db.execute(
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(Opportunity.id == opportunity_id)
    )
    opportunity = result.unique().scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    # Увеличиваем счётчик просмотров
    opportunity.views_count += 1
    await db.commit()

    return opportunity


@router.put(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Редактировать возможность",
)
async def update_opportunity(
    opportunity_id: int,
    data: OpportunityUpdate,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """Редактирование возможности её владельцем."""
    # Проверяем компанию
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    # Проверяем возможность
    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.tags))
        .where(
            Opportunity.id == opportunity_id,
            Opportunity.company_id == company.id,
        )
    )
    opportunity = result.unique().scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена или принадлежит другой компании",
        )

    # Обновляем поля
    update_fields = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_fields.items():
        setattr(opportunity, field, value)

    # Обновляем теги если переданы
    if data.tag_ids is not None:
        tag_result = await db.execute(
            select(Tag).where(
                Tag.id.in_(data.tag_ids),
                Tag.is_approved == True,
            )
        )
        opportunity.tags = list(tag_result.scalars().all())

    # Если компания NEW — после редактирования снова на модерацию
    if company.trust_level == TrustLevel.NEW:
        opportunity.moderation_status = ModerationStatus.PENDING
        opportunity.status = OpportunityStatus.PENDING_MODERATION

    await db.commit()

    # Перезагружаем
    result = await db.execute(
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(Opportunity.id == opportunity.id)
    )
    opportunity = result.unique().scalar_one()

    return opportunity


@router.patch(
    "/{opportunity_id}/status",
    response_model=OpportunityResponse,
    summary="Сменить статус возможности",
)
async def change_opportunity_status(
    opportunity_id: int,
    data: StatusUpdate,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """Закрыть, активировать или запланировать возможность."""
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    result = await db.execute(
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            joinedload(Opportunity.company),
        )
        .where(
            Opportunity.id == opportunity_id,
            Opportunity.company_id == company.id,
        )
    )
    opportunity = result.unique().scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    # Работодатель может только закрыть или активировать
    allowed_statuses = {
        OpportunityStatus.ACTIVE,
        OpportunityStatus.CLOSED,
        OpportunityStatus.SCHEDULED,
        OpportunityStatus.DRAFT,
    }
    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые статусы: {', '.join(s.value for s in allowed_statuses)}",
        )

    # Нельзя активировать если не одобрено модерацией
    if data.status == OpportunityStatus.ACTIVE:
        if opportunity.moderation_status != ModerationStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя активировать возможность, не прошедшую модерацию",
            )
        opportunity.published_at = datetime.now(timezone.utc)

    opportunity.status = data.status
    await db.commit()
    await db.refresh(opportunity)

    return opportunity


@router.delete(
    "/{opportunity_id}",
    response_model=MessageResponse,
    summary="Удалить возможность",
)
async def delete_opportunity(
    opportunity_id: int,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """Мягкое удаление (закрытие) возможности."""
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    result = await db.execute(
        select(Opportunity).where(
            Opportunity.id == opportunity_id,
            Opportunity.company_id == company.id,
        )
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    opportunity.status = OpportunityStatus.CLOSED
    await db.commit()

    return MessageResponse(message="Возможность закрыта")