from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.contact import Contact, ContactStatus, Recommendation
from app.models.opportunity import Opportunity
from app.models.notification import Notification, NotificationType
from app.schemas.contact import (
    ContactResponse,
    ContactListResponse,
    RecommendationCreate,
    RecommendationResponse,
)
from app.schemas.user import UserShort
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/contacts", tags=["Контакты"])


@router.get(
    "",
    response_model=list[ContactResponse],
    summary="Мои контакты",
)
async def get_contacts(
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Список принятых контактов текущего соискателя."""
    result = await db.execute(
        select(Contact)
        .options(
            joinedload(Contact.user),
            joinedload(Contact.contact),
        )
        .where(
            Contact.status == ContactStatus.ACCEPTED,
            or_(
                Contact.user_id == user.id,
                Contact.contact_id == user.id,
            ),
        )
        .order_by(Contact.created_at.desc())
    )
    contacts = result.unique().scalars().all()

    return contacts


@router.get(
    "/requests",
    response_model=list[ContactResponse],
    summary="Входящие запросы",
)
async def get_incoming_requests(
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Входящие запросы в контакты, ожидающие подтверждения."""
    result = await db.execute(
        select(Contact)
        .options(
            joinedload(Contact.user),
            joinedload(Contact.contact),
        )
        .where(
            Contact.contact_id == user.id,
            Contact.status == ContactStatus.PENDING,
        )
        .order_by(Contact.created_at.desc())
    )
    return result.unique().scalars().all()


@router.post(
    "/{target_user_id}/request",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Отправить запрос в контакты",
)
async def send_contact_request(
    target_user_id: int,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Отправить запрос на добавление в контакты другому соискателю."""
    if target_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя добавить себя в контакты",
        )

    # Проверяем что целевой пользователь существует и является соискателем
    target_result = await db.execute(
        select(User).where(
            User.id == target_user_id,
            User.role == UserRole.APPLICANT,
            User.is_active == True,
        )
    )
    target = target_result.scalar_one_or_none()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    # Проверяем существующие связи в обе стороны
    existing = await db.execute(
        select(Contact).where(
            or_(
                and_(Contact.user_id == user.id, Contact.contact_id == target_user_id),
                and_(Contact.user_id == target_user_id, Contact.contact_id == user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Запрос уже отправлен или контакт уже существует",
        )

    contact = Contact(
        user_id=user.id,
        contact_id=target_user_id,
        status=ContactStatus.PENDING,
    )
    db.add(contact)

    # Уведомление
    notification = Notification(
        user_id=target_user_id,
        type=NotificationType.CONTACT_REQUEST,
        title="Запрос в контакты",
        message=f"{user.display_name} хочет добавить вас в контакты",
        link="/applicant/contacts",
    )
    db.add(notification)

    await db.commit()

    return MessageResponse(message="Запрос отправлен")


@router.post(
    "/{contact_id}/accept",
    response_model=MessageResponse,
    summary="Принять запрос",
)
async def accept_contact(
    contact_id: int,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Принять входящий запрос в контакты."""
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.contact_id == user.id,
            Contact.status == ContactStatus.PENDING,
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос не найден",
        )

    contact.status = ContactStatus.ACCEPTED

    # Уведомление отправителю
    notification = Notification(
        user_id=contact.user_id,
        type=NotificationType.CONTACT_ACCEPTED,
        title="Контакт принят",
        message=f"{user.display_name} принял ваш запрос в контакты",
        link="/applicant/contacts",
    )
    db.add(notification)

    await db.commit()

    return MessageResponse(message="Контакт добавлен")


@router.post(
    "/{contact_id}/reject",
    response_model=MessageResponse,
    summary="Отклонить запрос",
)
async def reject_contact(
    contact_id: int,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Отклонить входящий запрос в контакты."""
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.contact_id == user.id,
            Contact.status == ContactStatus.PENDING,
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос не найден",
        )

    contact.status = ContactStatus.REJECTED
    await db.commit()

    return MessageResponse(message="Запрос отклонён")


@router.delete(
    "/{contact_id}",
    response_model=MessageResponse,
    summary="Удалить из контактов",
)
async def remove_contact(
    contact_id: int,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Удалить контакт."""
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            or_(
                Contact.user_id == user.id,
                Contact.contact_id == user.id,
            ),
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Контакт не найден",
        )

    await db.delete(contact)
    await db.commit()

    return MessageResponse(message="Контакт удалён")


# === Рекомендации ===

@router.post(
    "/recommend",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Рекомендовать друга на вакансию",
)
async def recommend_contact(
    data: RecommendationCreate,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Рекомендовать контакт на возможность."""
    if data.to_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя рекомендовать себя",
        )

    # Проверяем что это контакт
    contact_check = await db.execute(
        select(Contact).where(
            Contact.status == ContactStatus.ACCEPTED,
            or_(
                and_(Contact.user_id == user.id, Contact.contact_id == data.to_user_id),
                and_(Contact.user_id == data.to_user_id, Contact.contact_id == user.id),
            ),
        )
    )
    if not contact_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Можно рекомендовать только контактам",
        )

    # Проверяем возможность
    opp_result = await db.execute(
        select(Opportunity).where(Opportunity.id == data.opportunity_id)
    )
    opportunity = opp_result.scalar_one_or_none()
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    rec = Recommendation(
        from_user_id=user.id,
        to_user_id=data.to_user_id,
        opportunity_id=data.opportunity_id,
        message=data.message,
    )
    db.add(rec)

    # Уведомление
    notification = Notification(
        user_id=data.to_user_id,
        type=NotificationType.RECOMMENDATION,
        title="Рекомендация от друга",
        message=f"{user.display_name} рекомендует вам «{opportunity.title}»",
        link=f"/opportunities/{opportunity.id}",
    )
    db.add(notification)

    await db.commit()

    return MessageResponse(message="Рекомендация отправлена")


@router.get(
    "/recommendations",
    response_model=list[RecommendationResponse],
    summary="Рекомендации мне",
)
async def get_my_recommendations(
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Список рекомендаций, полученных от контактов."""
    result = await db.execute(
        select(Recommendation)
        .options(joinedload(Recommendation.from_user))
        .where(Recommendation.to_user_id == user.id)
        .order_by(Recommendation.created_at.desc())
    )
    recommendations = result.unique().scalars().all()

    items = []
    for rec in recommendations:
        from_short = UserShort(
            id=rec.from_user.id,
            display_name=rec.from_user.display_name,
            role=rec.from_user.role,
            avatar_url=rec.from_user.avatar_url,
        )
        items.append(RecommendationResponse(
            id=rec.id,
            from_user=from_short,
            opportunity_id=rec.opportunity_id,
            message=rec.message,
            is_read=rec.is_read,
            created_at=rec.created_at,
        ))

    return items