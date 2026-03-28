# backend/app/routers/curator.py

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.dependencies import require_role, get_current_curator
from app.models.user import User, UserRole
from app.models.company import Company, VerificationStatus, TrustLevel, CompanyStatus
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
from app.schemas.company import CompanyDetailResponse, CompanyUpdate
from app.schemas.opportunity import OpportunityResponse, OpportunityUpdate
from app.schemas.user import UserResponse, ApplicantProfileUpdate
from app.schemas.tag import TagResponse
from app.schemas.common import MessageResponse
from app.utils.security import hash_password

router = APIRouter(prefix="/api/curator", tags=["Куратор / Модерация"])

CURATOR_ROLES = (UserRole.CURATOR, UserRole.ADMIN)

# === Дашборд ===

@router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    current_user: User = Depends(get_current_curator),
    db: AsyncSession = Depends(get_db)
):
    """Получение статистики платформы для куратора"""
    
    # Подсчет пользователей по ролям
    total_users = await db.scalar(select(func.count()).select_from(User))
    
    # Студенты/соискатели
    total_applicants = await db.scalar(
        select(func.count()).select_from(User).where(
            User.role.in_([UserRole.STUDENT, UserRole.APPLICANT])
        )
    )
    
    # Компании/работодатели
    total_employers = await db.scalar(
        select(func.count()).select_from(User).where(
            User.role.in_([UserRole.COMPANY, UserRole.EMPLOYER])
        )
    )
    
    # Подсчет возможностей
    total_opportunities = await db.scalar(select(func.count()).select_from(Opportunity))
    
    active_opportunities = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.status == OpportunityStatus.ACTIVE
        )
    )
    
    # Подсчет заявок
    total_applications = await db.scalar(select(func.count()).select_from(Application))
    
    # Подсчет ожидающих верификации (исправлено)
    pending_verifications = await db.scalar(
        select(func.count()).select_from(Company).where(
            Company.status == CompanyStatus.PENDING_REVIEW
        )
    )
    
    # Подсчет ожидающих модерации
    pending_moderations = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.moderation_status == ModerationStatus.PENDING
        )
    )
    
    # Подсчет всех тегов
    total_tags = await db.scalar(
        select(func.count()).select_from(Tag).where(Tag.is_approved == True)
    )
    
    return PlatformStats(
        total_users=total_users or 0,
        total_applicants=total_applicants or 0,
        total_employers=total_employers or 0,
        total_opportunities=total_opportunities or 0,
        active_opportunities=active_opportunities or 0,
        total_applications=total_applications or 0,
        pending_verifications=pending_verifications or 0,
        pending_moderations=pending_moderations or 0,
        total_tags=total_tags or 0
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
    # Используем только существующие статусы
    result = await db.execute(
        select(Company)
        .where(
            # Компании со статусом PENDING_REVIEW или verification_status = PENDING
            (Company.status == CompanyStatus.PENDING_REVIEW) |
            (Company.verification_status == VerificationStatus.PENDING)
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
        try:
            # Проверяем статусы для фильтрации
            for s in status_filter.split(","):
                s = s.strip()
                # Проверяем в VerificationStatus
                if s in [v.value for v in VerificationStatus]:
                    query = query.where(Company.verification_status == VerificationStatus(s))
                # Проверяем в CompanyStatus
                elif s in [v.value for v in CompanyStatus]:
                    query = query.where(Company.status == CompanyStatus(s))
        except ValueError:
            pass

    if search:
        query = query.where(
            or_(
                Company.full_name.ilike(f"%{search}%"),
                Company.short_name.ilike(f"%{search}%"),
                Company.brand_name.ilike(f"%{search}%"),
                Company.inn.ilike(f"%{search}%")
            )
        )

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

    allowed = {VerificationStatus.VERIFIED, VerificationStatus.REJECTED}
    if data.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые решения: {', '.join(s.value for s in allowed)}",
        )

    old_status = company.verification_status
    company.verification_status = data.status
    company.rejection_reason = data.comment
    company.verified_by = user.id

    if data.status == VerificationStatus.VERIFIED:
        company.verified_at = datetime.now(timezone.utc)
        company.status = CompanyStatus.ACTIVE

    status_text = "подтверждена ✅" if data.status == VerificationStatus.VERIFIED else "отклонена ❌"
    
    if company.owner_id:
        # Используем COMPANY_VERIFIED или COMPANY_REJECTED вместо VERIFICATION_UPDATE
        notification_type = NotificationType.COMPANY_VERIFIED.value if data.status == VerificationStatus.VERIFIED else NotificationType.COMPANY_REJECTED.value
        
        notification = Notification(
            user_id=company.owner_id,
            type=notification_type,
            title="Статус верификации" if data.status == VerificationStatus.VERIFIED else "Компания отклонена",
            message=f"Ваша компания «{company.full_name}» {status_text}."
                    + (f" Комментарий: {data.comment}" if data.comment else ""),
            data={"company_id": company_id, "action": "verification_result"},
        )
        db.add(notification)

    await db.commit()

    return MessageResponse(
        message=f"Компания {company.full_name}: {old_status.value} → {data.status.value}"
    )

# === Модерация возможностей ===
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

    if opportunity.company:
        opportunity.company.approved_cards_count += 1

        count = opportunity.company.approved_cards_count
        if count >= 20:
            opportunity.company.trust_level = TrustLevel.VERIFIED
        elif count >= 5:
            opportunity.company.trust_level = TrustLevel.TRUSTED

    if opportunity.company and opportunity.company.owner_id:
        notification = Notification(
            user_id=opportunity.company.owner_id,
            type=NotificationType.CARD_APPROVED.value,
            title="Возможность одобрена",
            message=f"Ваша возможность «{opportunity.title}» одобрена и опубликована ✅",
            data={"opportunity_id": opportunity.id, "link": "/company/opportunities"},
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

    if opportunity.company and opportunity.company.owner_id:
        notification = Notification(
            user_id=opportunity.company.owner_id,
            type=NotificationType.CARD_REJECTED.value,
            title="Возможность отклонена",
            message=f"Ваша возможность «{opportunity.title}» отклонена ❌."
                    + (f" Причина: {data.comment}" if data.comment else ""),
            data={"opportunity_id": opportunity.id, "link": "/company/opportunities"},
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
    """Запросить изменения в возможности."""
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

    if opportunity.company and opportunity.company.owner_id:
        notification = Notification(
            user_id=opportunity.company.owner_id,
            type=NotificationType.SYSTEM.value,
            title="Требуются изменения",
            message=f"В возможности «{opportunity.title}» требуются изменения."
                    + (f" Комментарий: {data.comment}" if data.comment else ""),
            data={"opportunity_id": opportunity.id, "link": "/company/opportunities"},
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
        try:
            roles = [UserRole(r.strip()) for r in role.split(",") if r.strip()]
            if roles:
                query = query.where(User.role.in_(roles))
        except ValueError:
            pass

    if search:
        query = query.where(
            or_(
                User.display_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%")
            )
        )

    if is_active is not None:
        if is_active:
            query = query.where(User.status == "active")
        else:
            query = query.where(User.status != "active")

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

    if target.role == UserRole.ADMIN and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя деактивировать администратора",
        )

    if target.id == user.id and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя деактивировать свой аккаунт",
        )

    target.status = "active" if data.is_active else "suspended"
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
        hashed_password=hash_password(data.password),
        display_name=data.display_name.strip(),
        first_name=data.display_name.strip(),
        last_name="",
        role=UserRole.CURATOR,
        status="active",
        is_email_verified=True,
    )
    db.add(curator)
    await db.commit()
    await db.refresh(curator)

    return curator


# === Редактирование карточек возможностей куратором ===

@router.put(
    "/opportunities/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Редактировать возможность (куратор)",
)
async def curator_edit_opportunity(
    opportunity_id: int,
    data: OpportunityUpdate,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Куратор может редактировать любую карточку возможности."""
    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.tags), selectinload(Opportunity.company))
        .where(Opportunity.id == opportunity_id)
    )
    opportunity = result.scalar_one_or_none()

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    update_fields = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_fields.items():
        if value is not None:
            setattr(opportunity, field, value)

    if data.tag_ids is not None:
        tag_result = await db.execute(
            select(Tag).where(Tag.id.in_(data.tag_ids), Tag.is_approved == True)
        )
        opportunity.tags = list(tag_result.scalars().all())

    await db.commit()

    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.tags), selectinload(Opportunity.company))
        .where(Opportunity.id == opportunity_id)
    )
    return result.scalar_one()


# === Редактирование профиля компании куратором ===

@router.put(
    "/companies/{company_id}",
    response_model=CompanyDetailResponse,
    summary="Редактировать компанию (куратор)",
)
async def curator_edit_company(
    company_id: int,
    data: CompanyUpdate,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Куратор может редактировать профиль любой компании."""
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if value is not None:
            setattr(company, field, value)

    await db.commit()
    await db.refresh(company)
    return company


# === Редактирование профиля соискателя куратором ===

@router.put(
    "/applicants/{user_id}",
    response_model=MessageResponse,
    summary="Редактировать профиль соискателя (куратор)",
)
async def curator_edit_applicant(
    user_id: int,
    data: ApplicantProfileUpdate,
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Куратор может редактировать профиль любого соискателя."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    # Обновляем поля профиля
    update_fields = data.model_dump(exclude_unset=True, exclude={"skill_ids"})
    for field, value in update_fields.items():
        if value is not None:
            setattr(target_user, field, value)

    await db.commit()
    return MessageResponse(message="Профиль обновлён")

@router.post(
    "/companies/{company_id}/request-info",
    response_model=MessageResponse,
    summary="Запросить дополнительную информацию",
)
async def request_additional_info(
    company_id: int,
    data: dict,  # { "message": "текст запроса" }
    user: User = Depends(require_role(*CURATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Куратор запрашивает дополнительную информацию у компании."""
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    if not company.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У компании нет владельца",
        )

    message = data.get("message", "")
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сообщение не может быть пустым",
        )

    # Создаем уведомление для владельца компании (без поля link)
    notification = Notification(
        user_id=company.owner_id,
        type=NotificationType.SYSTEM.value,  # Используем строковое значение
        title="Запрос дополнительной информации",
        message=f"Куратор запросил дополнительную информацию по компании «{company.full_name}».\n\n{message}",
        data={"company_id": company_id, "action": "request_info"},
    )
    db.add(notification)

    await db.commit()

    return MessageResponse(message="Запрос на дополнительную информацию отправлен")