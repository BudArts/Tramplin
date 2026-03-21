from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.models.notification import Notification, NotificationType
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ConversationResponse,
)
from app.schemas.user import UserShort
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/chat", tags=["Чат"])


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
    summary="Список диалогов",
)
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список всех диалогов текущего пользователя."""
    # Находим всех пользователей с кем есть переписка
    result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender), selectinload(ChatMessage.receiver))
        .where(
            or_(
                ChatMessage.sender_id == user.id,
                ChatMessage.receiver_id == user.id,
            )
        )
        .order_by(ChatMessage.created_at.desc())
    )
    messages = result.scalars().all()

    # Группируем по собеседнику
    conversations = {}
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
        other_user = msg.receiver if msg.sender_id == user.id else msg.sender

        if other_id not in conversations:
            conversations[other_id] = {
                "user": UserShort(
                    id=other_user.id,
                    display_name=other_user.display_name,
                    role=other_user.role,
                    avatar_url=other_user.avatar_url,
                ),
                "last_message": msg.message[:100],
                "last_message_at": msg.created_at,
                "unread_count": 0,
                "opportunity_id": msg.opportunity_id,
            }

        if msg.receiver_id == user.id and not msg.is_read:
            conversations[other_id]["unread_count"] += 1

    return [ConversationResponse(**conv) for conv in conversations.values()]


@router.get(
    "/with/{other_user_id}",
    response_model=list[ChatMessageResponse],
    summary="История сообщений",
)
async def get_messages(
    other_user_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """История сообщений с конкретным пользователем."""
    result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender), selectinload(ChatMessage.receiver))
        .where(
            or_(
                and_(ChatMessage.sender_id == user.id, ChatMessage.receiver_id == other_user_id),
                and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == user.id),
            )
        )
        .order_by(ChatMessage.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    messages = result.scalars().all()

    # Помечаем прочитанными
    for msg in messages:
        if msg.receiver_id == user.id and not msg.is_read:
            msg.is_read = True
    await db.commit()

    items = []
    for msg in reversed(messages):
        items.append(ChatMessageResponse(
            id=msg.id,
            sender=UserShort(
                id=msg.sender.id, display_name=msg.sender.display_name,
                role=msg.sender.role, avatar_url=msg.sender.avatar_url,
            ),
            receiver=UserShort(
                id=msg.receiver.id, display_name=msg.receiver.display_name,
                role=msg.receiver.role, avatar_url=msg.receiver.avatar_url,
            ),
            opportunity_id=msg.opportunity_id,
            message=msg.message,
            is_read=msg.is_read,
            created_at=msg.created_at,
        ))

    return items


@router.post(
    "",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Отправить сообщение",
)
async def send_message(
    data: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отправить сообщение пользователю."""
    if data.receiver_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя написать самому себе",
        )

    # Проверяем что получатель существует
    receiver_result = await db.execute(
        select(User).where(User.id == data.receiver_id, User.is_active == True)
    )
    receiver = receiver_result.scalar_one_or_none()

    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    msg = ChatMessage(
        sender_id=user.id,
        receiver_id=data.receiver_id,
        opportunity_id=data.opportunity_id,
        message=data.message.strip(),
    )
    db.add(msg)

    # Уведомление
    notification = Notification(
        user_id=data.receiver_id,
        type=NotificationType.SYSTEM,
        title="Новое сообщение",
        message=f"{user.display_name}: {data.message[:80]}",
        link=f"/chat/{user.id}",
    )
    db.add(notification)

    await db.commit()
    await db.refresh(msg)

    return ChatMessageResponse(
        id=msg.id,
        sender=UserShort(
            id=user.id, display_name=user.display_name,
            role=user.role, avatar_url=user.avatar_url,
        ),
        receiver=UserShort(
            id=receiver.id, display_name=receiver.display_name,
            role=receiver.role, avatar_url=receiver.avatar_url,
        ),
        opportunity_id=msg.opportunity_id,
        message=msg.message,
        is_read=False,
        created_at=msg.created_at,
    )


@router.get(
    "/unread",
    summary="Непрочитанные сообщения",
)
async def unread_messages_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await db.scalar(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.receiver_id == user.id,
            ChatMessage.is_read == False,
        )
    ) or 0
    return {"unread_count": count}