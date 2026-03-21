from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.support import SupportTicket, TicketStatus, TicketCategory
from app.models.notification import Notification, NotificationType
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/support", tags=["Техподдержка"])


class TicketCreate(BaseModel):
    category: TicketCategory
    subject: str = Field(min_length=3, max_length=300)
    message: str = Field(min_length=10, max_length=5000)


class TicketResponse(BaseModel):
    id: int
    category: TicketCategory
    subject: str
    message: str
    status: TicketStatus
    response: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TicketReply(BaseModel):
    response: str = Field(min_length=1, max_length=5000)
    status: TicketStatus = TicketStatus.RESOLVED


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать обращение",
)
async def create_ticket(
    data: TicketCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = SupportTicket(
        user_id=user.id,
        category=data.category,
        subject=data.subject.strip(),
        message=data.message.strip(),
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get(
    "/my",
    response_model=list[TicketResponse],
    summary="Мои обращения",
)
async def my_tickets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.user_id == user.id)
        .order_by(SupportTicket.created_at.desc())
    )
    return result.scalars().all()


# === Для кураторов ===

@router.get(
    "/all",
    response_model=list[TicketResponse],
    summary="Все обращения (куратор)",
)
async def all_tickets(
    status_filter: TicketStatus | None = None,
    user: User = Depends(require_role(UserRole.CURATOR, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    query = select(SupportTicket).order_by(SupportTicket.created_at.desc())
    if status_filter:
        query = query.where(SupportTicket.status == status_filter)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch(
    "/{ticket_id}/reply",
    response_model=MessageResponse,
    summary="Ответить на обращение (куратор)",
)
async def reply_ticket(
    ticket_id: int,
    data: TicketReply,
    user: User = Depends(require_role(UserRole.CURATOR, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    ticket.response = data.response.strip()
    ticket.status = data.status
    ticket.responded_by = user.id

    notification = Notification(
        user_id=ticket.user_id,
        type=NotificationType.SYSTEM,
        title="Ответ на обращение",
        message=f"Ваше обращение «{ticket.subject}» получило ответ",
        link="/support",
    )
    db.add(notification)

    await db.commit()
    return MessageResponse(message="Ответ отправлен")