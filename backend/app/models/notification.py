import enum
from datetime import datetime

from sqlalchemy import (
    String, Text, Enum, DateTime, Integer, ForeignKey, Boolean, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NotificationType(str, enum.Enum):
    APPLICATION_STATUS = "application_status"
    NEW_APPLICATION = "new_application"
    VERIFICATION_UPDATE = "verification_update"
    MODERATION_UPDATE = "moderation_update"
    CONTACT_REQUEST = "contact_request"
    CONTACT_ACCEPTED = "contact_accepted"
    RECOMMENDATION = "recommendation"
    SYSTEM = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification {self.id} user={self.user_id} [{self.type.value}]>"