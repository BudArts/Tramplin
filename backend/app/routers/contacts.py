# contacts.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.services.contact_service import ContactService
from app.schemas.contact import (
    ContactResponse,
    ContactListResponse,
    RecommendationCreate,
    RecommendationResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/contacts", tags=["Контакты"])


@router.get(
    "",
    response_model=ContactListResponse,
    summary="Мои контакты",
)
async def list_contacts(
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено: STUDENT вместо APPLICANT
    db: AsyncSession = Depends(get_db),
):
    """Список принятых контактов (друзей) текущего соискателя."""
    service = ContactService(db, user)
    items, total = await service.get_contacts()
    return ContactListResponse(items=items, total=total)


@router.get(
    "/requests",
    response_model=ContactListResponse,
    summary="Входящие запросы в контакты",
)
async def incoming_requests(
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Входящие запросы на добавление в контакты."""
    service = ContactService(db, user)
    items, total = await service.get_incoming_requests()
    return ContactListResponse(items=items, total=total)


@router.get(
    "/outgoing",
    response_model=ContactListResponse,
    summary="Исходящие запросы",
)
async def outgoing_requests(
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Исходящие запросы на добавление в контакты."""
    service = ContactService(db, user)
    items, total = await service.get_outgoing_requests()
    return ContactListResponse(items=items, total=total)


@router.post(
    "/{target_user_id}/request",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Отправить запрос в контакты",
)
async def send_contact_request(
    target_user_id: int,
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Отправить запрос на добавление в контакты другому соискателю."""
    service = ContactService(db, user)
    message = await service.send_contact_request(target_user_id)
    return MessageResponse(message=message)


@router.post(
    "/{contact_id}/accept",
    response_model=MessageResponse,
    summary="Принять запрос",
)
async def accept_contact_request(
    contact_id: int,
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Принять входящий запрос в контакты."""
    service = ContactService(db, user)
    message = await service.accept_contact_request(contact_id)
    return MessageResponse(message=message)


@router.post(
    "/{contact_id}/reject",
    response_model=MessageResponse,
    summary="Отклонить запрос",
)
async def reject_contact_request(
    contact_id: int,
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Отклонить входящий запрос в контакты."""
    service = ContactService(db, user)
    message = await service.reject_contact_request(contact_id)
    return MessageResponse(message=message)


@router.delete(
    "/{contact_id}",
    response_model=MessageResponse,
    summary="Удалить из контактов",
)
async def remove_contact(
    contact_id: int,
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Удалить пользователя из контактов."""
    service = ContactService(db, user)
    message = await service.remove_contact(contact_id)
    return MessageResponse(message=message)


# === Рекомендации ===

@router.post(
    "/recommend",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Рекомендовать друга на вакансию",
)
async def recommend_contact(
    data: RecommendationCreate,
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """
    Рекомендовать контакт (друга) на возможность.
    Можно рекомендовать только принятых контактов.
    """
    service = ContactService(db, user)
    message = await service.recommend_contact(
        to_user_id=data.to_user_id,
        opportunity_id=data.opportunity_id,
        message=data.message,
    )
    return MessageResponse(message=message)


@router.get(
    "/recommendations",
    response_model=list[RecommendationResponse],
    summary="Рекомендации мне",
)
async def my_recommendations(
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Список рекомендаций, полученных от контактов."""
    service = ContactService(db, user)
    return await service.get_my_recommendations()


@router.post(
    "/recommendations/{recommendation_id}/read",
    response_model=MessageResponse,
    summary="Отметить рекомендацию как прочитанную",
)
async def mark_recommendation_read(
    recommendation_id: int,
    user: User = Depends(require_role(UserRole.STUDENT)),  # Исправлено
    db: AsyncSession = Depends(get_db),
):
    """Отметить рекомендацию как прочитанную."""
    service = ContactService(db, user)
    success = await service.mark_recommendation_as_read(recommendation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Рекомендация не найдена",
        )
    
    return MessageResponse(message="Рекомендация отмечена как прочитанная")