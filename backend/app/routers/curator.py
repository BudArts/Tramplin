from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, UserRole, ApplicantProfile
from app.models.company import Company, VerificationStatus, TrustLevel
from app.models.opportunity import (
    Opportunity, OpportunityStatus, ModerationStatus,
)
from app.models.application import Application
from app.models.tag import Tag
from app.models.notification import Notification, NotificationType
from app.schemas.curator import (
    VerificationDecision,
    ModerationDecision,
    UserStatusUpdate,
    CuratorCreate,
    PlatformStats,
)
from app.schemas.company import CompanyDetailResponse
from app.schemas.opportunity import OpportunityResponse
from app.schemas.user import UserResponse
from app.schemas.tag import TagResponse
from app.schemas.common import MessageResponse
from app.utils.security import hash_password

router = APIRouter(prefix="/api/curator", tags=["Куратор / Модерация"])

# Допустимые роли для куратора
CURATOR_ROLES = (UserRole.CURATOR, UserRole.ADMIN)


# === Дашборд ===

@router.get(
    "/stats",
    response_model=PlatformStats,
    summary="Статистика платформы",
)
async def platform_stats(
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Общая статистика платформы для дашборда куратора."""
    total_users = await db.scalar(select(func.count(User.id))) or 0
    total_applicants = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.APPLICANT)
    ) or 0
    total_employers = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.EMPLOYER)
    ) or 0
    total_opportunities = await db.scalar(
        select(func.count(Opportunity.id))
    ) or 0
    active_opportunities = await db.scalar(
        select(func.count(Opportunity.id)).where(
            Opportunity.status == OpportunityStatus.ACTIVE
        )
    ) or 0
    total_applications = await db.scalar(
        select(func.count(Application.id))
    ) or 0
    pending_verifications = await db.scalar(
        select(func.count(Company.id)).where(
            Company.verification_status.in_([
                VerificationStatus.PENDING,
                VerificationStatus.INN_VERIFIED,
                VerificationStatus.EMAIL_CONFIRMED,
            ])
        )
    ) or 0
    pending_moderations = await db.scalar(
        select(func.count(Opportunity.id)).where(
            Opportunity.moderation_status == ModerationStatus.PENDING
        )
    ) or 0
    total_tags = await db.scalar(select(func.count(Tag.id))) or 0

    return PlatformStats(
        total_users=total_users,
        total_applicants=total_applicants,
        total_employers=total_employers,
        total_opportunities=total_opportunities,
        active_opportunities=active_opportunities,
        total_applications=total_applications,
        pending_verifications=pending_verifications,
        pending_moderations=pending_moderations,
        total_tags=total_tags,
    )


# === Верификация компаний ===

@router.get(
    "/companies/pending",
    response_model=list[CompanyDetailResponse],
    summary="Очередь верификации",
)
async def pending_verifications(
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Компании, ожидающие верификации."""
    result = await db.execute(
        select(Company)
        .where(
            Company.verification_status.in_([
                VerificationStatus.PENDING,
                VerificationStatus.INN_VERIFIED,
                VerificationStatus.EMAIL_CONFIRMED,
            ])
        )
        .order_by(Company.created_at.asc())
    )
    companies = result.scalars().all()
    return companies


@router.get(
    "/companies",
    response_model=list[CompanyDetailResponse],
    summary="Все компании",
)
async def all_companies(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Список всех компаний для управления."""
    query = select(Company)

    if status_filter:
        statuses = [
            VerificationStatus(s.strip())
            for s in status_filter.split(",")
            if s.strip()
        ]
        query = query.where(Company.verification_status.in_(statuses))

    if search:
        query = query.where(Company.name.ilike(f"%{search}%"))

    query = query.order_by(Company.created_at.desc())

    result = await db.execute(query)
    companies = result.scalars().all()
    return companies


@router.patch(
    "/companies/{company_id}/verify",
    response_model=MessageResponse,
    summary="Верифицировать компанию",
)
async def verify_company(
    company_id: int,
    data: VerificationDecision,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Куратор принимает решение о верификации компании."""
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    # Проверяем допустимые решения
    allowed = {VerificationStatus.VERIFIED, VerificationStatus.REJECTED}
    if data.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые решения: {', '.join(s.value for s in allowed)}",
        )

    old_status = company.verification_status
    company.verification_status = data.status
    company.verification_comment = data.comment
    company.verified_by = user.id

    if data.status == VerificationStatus.VERIFIED:
        company.verified_at = datetime.now(timezone.utc)

    # Уведомление работодателю
    status_text = "подтверждена ✅" if data.status == VerificationStatus.VERIFIED else "отклонена ❌"
    notification = Notification(
        user_id=company.owner_id,
        type=NotificationType.VERIFICATION_UPDATE,
        title="Статус верификации",
        message=f"Ваша компания «{company.name}» {status_text}."
                + (f" Комментарий: {data.comment}" if data.comment else ""),
        link="/employer/company",
    )
    db.add(notification)

    await db.commit()

    return MessageResponse(
        message=f"Компания {company.name}: {old_status.value} → {data.status.value}"
    )


# === Модерация возможностей ===

@router.get(
    "/opportunities/pending",
    response_model=list[OpportunityResponse],
    summary="Очередь модерации",
)
async def pending_moderations(
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Возможности, ожидающие модерации."""
    result = await db.execute(
        select(Opportunity)
        .options(
            selectinload(Opportunity.tags),
            selectinload(Opportunity.company),
        )
        .where(Opportunity.moderation_status == ModerationStatus.PENDING)
        .order_by(Opportunity.created_at.asc())
    )
    opportunities = result.scalars().unique().all()
    return opportunities


@router.patch(
    "/opportunities/{opportunity_id}/approve",
    response_model=MessageResponse,
    summary="Одобрить возможность",
)
async def approve_opportunity(
    opportunity_id: int,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Одобрить возможность — она становится активной."""
    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.company))
        .where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    opportunity.moderation_status = ModerationStatus.APPROVED
    opportunity.status = OpportunityStatus.ACTIVE
    opportunity.moderated_by = user.id
    opportunity.published_at = datetime.now(timezone.utc)

    # Увеличиваем счётчик одобренных карточек компании
    if opportunity.company:
        opportunity.company.approved_cards_count += 1

        # Обновляем trust level
        count = opportunity.company.approved_cards_count
        if count >= 20:
            opportunity.company.trust_level = TrustLevel.PREMIUM
        elif count >= 5:
            opportunity.company.trust_level = TrustLevel.TRUSTED

    # Уведомление работодателю
    if opportunity.company:
        notification = Notification(
            user_id=opportunity.company.owner_id,
            type=NotificationType.MODERATION_UPDATE,
            title="Возможность одобрена",
            message=f"Ваша возможность «{opportunity.title}» одобрена и опубликована ✅",
            link=f"/employer/opportunities",
        )
        db.add(notification)

    await db.commit()

    return MessageResponse(message=f"Возможность «{opportunity.title}» одобрена")


@router.patch(
    "/opportunities/{opportunity_id}/reject",
    response_model=MessageResponse,
    summary="Отклонить возможность",
)
async def reject_opportunity(
    opportunity_id: int,
    data: ModerationDecision,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Отклонить возможность с комментарием."""
    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.company))
        .where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    opportunity.moderation_status = ModerationStatus.REJECTED
    opportunity.status = OpportunityStatus.REJECTED
    opportunity.moderated_by = user.id
    opportunity.moderation_comment = data.comment

    # Уведомление
    if opportunity.company:
        notification = Notification(
            user_id=opportunity.company.owner_id,
            type=NotificationType.MODERATION_UPDATE,
            title="Возможность отклонена",
            message=f"Ваша возможность «{opportunity.title}» отклонена ❌."
                    + (f" Причина: {data.comment}" if data.comment else ""),
            link=f"/employer/opportunities",
        )
        db.add(notification)

    await db.commit()

    return MessageResponse(message=f"Возможность «{opportunity.title}» отклонена")


@router.patch(
    "/opportunities/{opportunity_id}/request-changes",
    response_model=MessageResponse,
    summary="Запросить изменения",
)
async def request_changes(
    opportunity_id: int,
    data: ModerationDecision,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Запросить изменения в возможности — работодатель должен исправить и отправить повторно."""
    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.company))
        .where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    opportunity.moderation_status = ModerationStatus.CHANGES_REQUESTED
    opportunity.status = OpportunityStatus.DRAFT
    opportunity.moderated_by = user.id
    opportunity.moderation_comment = data.comment

    # Уведомление
    if opportunity.company:
        notification = Notification(
            user_id=opportunity.company.owner_id,
            type=NotificationType.MODERATION_UPDATE,
            title="Требуются изменения",
            message=f"В возможности «{opportunity.title}» требуются изменения."
                    + (f" Комментарий: {data.comment}" if data.comment else ""),
            link=f"/employer/opportunities",
        )
        db.add(notification)

    await db.commit()

    return MessageResponse(message=f"Запрос на изменения отправлен")


# === Управление пользователями ===

@router.get(
    "/users",
    response_model=list[UserResponse],
    summary="Список пользователей",
)
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Список всех пользователей платформы."""
    query = select(User)

    if role:
        roles = [UserRole(r.strip()) for r in role.split(",") if r.strip()]
        query = query.where(User.role.in_(roles))

    if search:
        query = query.where(
            User.display_name.ilike(f"%{search}%")
            | User.email.ilike(f"%{search}%")
        )

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    users = result.scalars().all()
    return users


@router.patch(
    "/users/{user_id}/status",
    response_model=MessageResponse,
    summary="Активировать/деактивировать пользователя",
)
async def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Блокировка или разблокировка пользователя."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    target = result.scalar_one_or_none()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    # Нельзя деактивировать админа
    if target.role == UserRole.ADMIN and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя деактивировать администратора",
        )

    # Нельзя деактивировать себя
    if target.id == user.id and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя деактивировать свой аккаунт",
        )

    target.is_active = data.is_active
    await db.commit()

    action = "активирован" if data.is_active else "деактивирован"
    return MessageResponse(message=f"Пользователь {target.display_name} {action}")


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Редактировать пользователя",
)
async def edit_user(
    user_id: int,
    display_name: Optional[str] = None,
    role: Optional[UserRole] = None,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Редактирование данных пользователя куратором."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    target = result.scalar_one_or_none()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    if display_name:
        target.display_name = display_name.strip()

    if role and user.role == UserRole.ADMIN:
        target.role = role

    await db.commit()
    await db.refresh(target)
    return target


# === Управление тегами ===

@router.get(
    "/tags/pending",
    response_model=list[TagResponse],
    summary="Теги на модерации",
)
async def pending_tags(
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Предложенные пользователями теги, ожидающие одобрения."""
    result = await db.execute(
        select(Tag)
        .where(Tag.is_approved == False)
        .order_by(Tag.id.asc())
    )
    tags = result.scalars().all()
    return tags


@router.patch(
    "/tags/{tag_id}/approve",
    response_model=MessageResponse,
    summary="Одобрить тег",
)
async def approve_tag(
    tag_id: int,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Одобрить предложенный тег."""
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id)
    )
    tag = result.scalar_one_or_none()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тег не найден",
        )

    tag.is_approved = True
    await db.commit()

    return MessageResponse(message=f"Тег «{tag.name}» одобрен")


@router.patch(
    "/tags/{tag_id}/reject",
    response_model=MessageResponse,
    summary="Отклонить тег",
)
async def reject_tag(
    tag_id: int,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Отклонить (удалить) предложенный тег."""
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id)
    )
    tag = result.scalar_one_or_none()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тег не найден",
        )

    tag_name = tag.name
    await db.delete(tag)
    await db.commit()

    return MessageResponse(message=f"Тег «{tag_name}» удалён")


# === Создание кураторов (только админ) ===

@router.post(
    "/curators",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать куратора",
)
async def create_curator(
    data: CuratorCreate,
    user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Создание нового куратора. Доступно только администратору.
    """
    # Проверяем уникальность email
    existing = await db.execute(
        select(User).where(User.email == data.email.lower().strip())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    curator = User(
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        display_name=data.display_name.strip(),
        role=UserRole.CURATOR,
    )
    db.add(curator)
    await db.commit()
    await db.refresh(curator)

    return curator