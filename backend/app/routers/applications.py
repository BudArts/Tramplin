from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload, selectinload
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.opportunity import Opportunity, OpportunityStatus, ModerationStatus
from app.models.application import Application, ApplicationStatus
from app.models.notification import Notification, NotificationType
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationWithOpportunity,
    ApplicationWithApplicant,
    ApplicationStatusUpdate,
    ApplicationListResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/applications", tags=["Отклики"])


# === Эндпоинты соискателя ===

@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Откликнуться на возможность",
)
async def create_application(
    data: ApplicationCreate,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """
    Соискатель откликается на вакансию/стажировку/мероприятие.
    Повторный отклик на ту же возможность запрещён.
    """
    # Проверяем что возможность существует и активна
    opp_result = await db.execute(
        select(Opportunity)
        .options(joinedload(Opportunity.company))
        .where(Opportunity.id == data.opportunity_id)
    )
    opportunity = opp_result.unique().scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    if opportunity.status != OpportunityStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Возможность неактивна, отклик невозможен",
        )

    # Проверяем дубликат
    existing = await db.execute(
        select(Application).where(
            Application.applicant_id == user.id,
            Application.opportunity_id == data.opportunity_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Вы уже откликались на эту возможность",
        )

    # Создаём отклик
    application = Application(
        applicant_id=user.id,
        opportunity_id=data.opportunity_id,
        cover_letter=data.cover_letter,
        status=ApplicationStatus.PENDING,
    )
    db.add(application)

    # Увеличиваем счётчик откликов
    opportunity.applications_count += 1

    # Уведомление работодателю
    notification = Notification(
        user_id=opportunity.company.owner_id,
        type=NotificationType.APPLICATION_RECEIVED.value,  # 👈 добавьте .value
        title="Новый отклик",
        message=f"{user.display_name or 'Пользователь'} откликнулся на «{opportunity.title}»",
        data={"opportunity_id": opportunity.id},
    )
    db.add(notification)

    await db.commit()
    await db.refresh(application)

    return application


@router.get(
    "/my",
    response_model=ApplicationListResponse,
    summary="Мои отклики",
)
async def get_my_applications(
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Список откликов текущего соискателя с пагинацией."""
    query = (
        select(Application)
        .options(
            joinedload(Application.opportunity).joinedload(Opportunity.company),
            joinedload(Application.opportunity).selectinload(Opportunity.tags),
        )
        .where(Application.applicant_id == user.id)
    )

    if status_filter:
        statuses = [ApplicationStatus(s.strip()) for s in status_filter.split(",")]
        query = query.where(Application.status.in_(statuses))

    # Подсчёт
    count_query = select(func.count()).select_from(
        select(Application.id).where(Application.applicant_id == user.id).subquery()
    )
    if status_filter:
        count_query = select(func.count()).select_from(
            select(Application.id)
            .where(
                Application.applicant_id == user.id,
                Application.status.in_(statuses),
            )
            .subquery()
        )
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Application.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    applications = result.unique().scalars().all()

    # Собираем ответ с информацией о вакансии
    items = []
    for app_item in applications:
        opp = app_item.opportunity
        opp_card = None
        if opp:
            from app.schemas.opportunity import OpportunityCardResponse
            opp_card = OpportunityCardResponse(
                id=opp.id,
                title=opp.title,
                type=opp.type,
                work_format=opp.work_format,
                salary_min=opp.salary_min,
                salary_max=opp.salary_max,
                city=opp.city,
                company_name=opp.company.name if opp.company else None,
                company_logo=opp.company.logo_url if opp.company else None,
                tags=opp.tags if opp.tags else [],
                published_at=opp.published_at,
            )

        items.append(ApplicationWithOpportunity(
            id=app_item.id,
            applicant_id=app_item.applicant_id,
            opportunity_id=app_item.opportunity_id,
            status=app_item.status,
            cover_letter=app_item.cover_letter,
            created_at=app_item.created_at,
            updated_at=app_item.updated_at,
            opportunity=opp_card,
        ))

    return ApplicationListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page),
    )


@router.delete(
    "/{application_id}",
    response_model=MessageResponse,
    summary="Отозвать отклик",
)
async def withdraw_application(
    application_id: int,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Соискатель отзывает свой отклик."""
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.applicant_id == user.id,
        )
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отклик не найден",
        )

    if application.status == ApplicationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отозвать принятый отклик",
        )

    # Уменьшаем счётчик
    opp_result = await db.execute(
        select(Opportunity).where(Opportunity.id == application.opportunity_id)
    )
    opportunity = opp_result.scalar_one_or_none()
    if opportunity and opportunity.applications_count > 0:
        opportunity.applications_count -= 1

    await db.delete(application)
    await db.commit()

    return MessageResponse(message="Отклик отозван")


# === Эндпоинты работодателя ===

@router.get(
    "/opportunity/{opportunity_id}",
    response_model=list[ApplicationWithApplicant],
    summary="Отклики на мою возможность",
)
async def get_opportunity_applications(
    opportunity_id: int,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """Список откликов на конкретную возможность работодателя."""
    # Проверяем что возможность принадлежит этому работодателю
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    opp_result = await db.execute(
        select(Opportunity).where(
            Opportunity.id == opportunity_id,
            Opportunity.company_id == company.id,
        )
    )
    if not opp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена или принадлежит другой компании",
        )

    # Получаем отклики
    query = (
        select(Application)
        .options(joinedload(Application.applicant))
        .where(Application.opportunity_id == opportunity_id)
    )

    if status_filter:
        statuses = [ApplicationStatus(s.strip()) for s in status_filter.split(",")]
        query = query.where(Application.status.in_(statuses))

    query = query.order_by(Application.created_at.desc())

    result = await db.execute(query)
    applications = result.unique().scalars().all()

    # Собираем ответ
    items = []
    for app_item in applications:
        from app.schemas.user import UserShort
        applicant_short = None
        if app_item.applicant:
            applicant_short = UserShort(
                id=app_item.applicant.id,
                display_name=app_item.applicant.display_name,
                role=app_item.applicant.role,
                avatar_url=app_item.applicant.avatar_url,
            )

        items.append(ApplicationWithApplicant(
            id=app_item.id,
            applicant_id=app_item.applicant_id,
            opportunity_id=app_item.opportunity_id,
            status=app_item.status,
            cover_letter=app_item.cover_letter,
            created_at=app_item.created_at,
            updated_at=app_item.updated_at,
            applicant=applicant_short,
        ))

    return items


@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Изменить статус отклика",
)
async def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    user: User = Depends(require_role(UserRole.EMPLOYER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Работодатель меняет статус отклика:
    viewed, accepted, rejected, reserve.
    """
    # Проверяем что работодатель владеет возможностью
    company_result = await db.execute(
        select(Company).where(Company.owner_id == user.id)
    )
    company = company_result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    # Находим отклик и проверяем принадлежность
    app_result = await db.execute(
        select(Application)
        .options(joinedload(Application.opportunity))
        .where(Application.id == application_id)
    )
    application = app_result.unique().scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отклик не найден",
        )

    if application.opportunity.company_id != company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Этот отклик относится к возможности другой компании",
        )

    # Валидация допустимых статусов для работодателя
    allowed = {
        ApplicationStatus.VIEWED,
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.RESERVE,
    }
    if data.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые статусы: {', '.join(s.value for s in allowed)}",
        )

    old_status = application.status
    application.status = data.status

    # Уведомление соискателю о смене статуса
    status_messages = {
        ApplicationStatus.VIEWED: "просмотрен",
        ApplicationStatus.ACCEPTED: "принят",
        ApplicationStatus.REJECTED: "отклонён",
        ApplicationStatus.RESERVE: "добавлен в резерв",
    }

    notification = Notification(
        user_id=application.applicant_id,
        type=NotificationType.APPLICATION_STATUS,
        title="Статус отклика изменён",
        message=f"Ваш отклик на «{application.opportunity.title}» {status_messages.get(data.status, 'обновлён')}",
        link=f"/applicant/applications",
    )
    db.add(notification)

    await db.commit()
    await db.refresh(application)

    return application