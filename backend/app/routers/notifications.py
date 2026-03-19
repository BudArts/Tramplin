from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationListResponse
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/notifications", tags=["Уведомления"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Мои уведомления",
)
async def get_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список уведомлений текущего пользователя."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifications = result.scalars().all()

    # Считаем непрочитанные
    unread_result = await db.execute(
        select(func.count()).select_from(
            select(Notification.id).where(
                Notification.user_id == user.id,
                Notification.is_read == False,
            ).subquery()
        )
    )
    unread_count = unread_result.scalar() or 0

    return NotificationListResponse(
        items=notifications,
        total=len(notifications),
        unread_count=unread_count,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=MessageResponse,
    summary="Прочитать уведомление",
)
async def mark_as_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Пометить уведомление как прочитанное."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Уведомление не найдено",
        )

    notification.is_read = True
    await db.commit()

    return MessageResponse(message="Прочитано")


@router.patch(
    "/read-all",
    response_model=MessageResponse,
    summary="Прочитать все уведомления",
)
async def mark_all_as_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Пометить все уведомления как прочитанные."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()

    return MessageResponse(message="Все уведомления прочитаны")


@router.get(
    "/unread-count",
    summary="Количество непрочитанных",
)
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Количество непрочитанных уведомлений."""
    result = await db.execute(
        select(func.count()).select_from(
            select(Notification.id).where(
                Notification.user_id == user.id,
                Notification.is_read == False,
            ).subquery()
        )
    )
    count = result.scalar() or 0

    return {"unread_count": count}