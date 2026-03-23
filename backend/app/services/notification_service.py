"""
Сервис уведомлений
"""
from typing import Optional, Any
from datetime import datetime
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType, NotificationSettings
from app.schemas.notification import NotificationSettingsUpdate


class NotificationService:
    """Сервис уведомлений"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_notification(
        self,
        user_id: int,
        type: str,
        title: str,
        message: Optional[str] = None,
        data: Optional[dict[str, Any]] = None
    ) -> Notification:
        """Создать уведомление"""
        notification = Notification(
            user_id=user_id,
            type=NotificationType(type),
            title=title,
            message=message,
            data=data
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        
        # TODO: Отправить email/push если включено в настройках
        
        return notification
    
    async def get_user_notifications(
        self,
        user_id: int,
        is_read: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[Notification], int, int]:
        """Получить уведомления пользователя"""
        query = select(Notification).where(Notification.user_id == user_id)
        
        if is_read is not None:
            query = query.where(Notification.is_read == is_read)
        
        query = query.order_by(Notification.created_at.desc())
        
        # Общее количество
        count_query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id
        )
        total = await self.db.execute(count_query)
        total = total.scalar()
        
        # Непрочитанные
        unread_query = select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        unread = await self.db.execute(unread_query)
        unread_count = unread.scalar()
        
        # Пагинация
        query = query.offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())
        
        return notifications, total, unread_count
    
    async def mark_as_read(
        self,
        user_id: int,
        notification_ids: list[int]
    ) -> int:
        """Отметить уведомления как прочитанные"""
        result = await self.db.execute(
            update(Notification)
            .where(
                and_(
                    Notification.id.in_(notification_ids),
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount
    
    async def mark_all_as_read(self, user_id: int) -> int:
        """Отметить все уведомления как прочитанные"""
        result = await self.db.execute(
            update(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount
    
    async def delete_notification(
        self,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Удалить уведомление"""
        notification = await self.db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            )
        )
        notification = notification.scalar_one_or_none()
        
        if notification:
            await self.db.delete(notification)
            await self.db.commit()
            return True
        return False
    
    async def get_unread_count(self, user_id: int) -> int:
        """Получить количество непрочитанных"""
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
        )
        return result.scalar() or 0
    
    # === Настройки уведомлений ===
    
    async def get_settings(self, user_id: int) -> NotificationSettings:
        """Получить настройки уведомлений"""
        result = await self.db.execute(
            select(NotificationSettings).where(
                NotificationSettings.user_id == user_id
            )
        )
        settings = result.scalar_one_or_none()
        
        if not settings:
            # Создаём настройки по умолчанию
            settings = NotificationSettings(user_id=user_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        
        return settings
    
    async def update_settings(
        self,
        user_id: int,
        data: NotificationSettingsUpdate
    ) -> NotificationSettings:
        """Обновить настройки уведомлений"""
        settings = await self.get_settings(user_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        await self.db.commit()
        await self.db.refresh(settings)
        
        return settings
    
    # === Вспомогательные методы для создания типовых уведомлений ===
    
    async def notify_welcome(self, user_id: int, user_name: str) -> Notification:
        """Приветственное уведомление"""
        return await self.create_notification(
            user_id=user_id,
            type="welcome",
            title="Добро пожаловать в Tramplin!",
            message=f"Привет, {user_name}! Рады видеть вас на платформе."
        )
    
    async def notify_company_verified(
        self,
        user_id: int,
        company_name: str,
        company_id: int
    ) -> Notification:
        """Уведомление о верификации компании"""
        return await self.create_notification(
            user_id=user_id,
            type="company_verified",
            title="Компания верифицирована",
            message=f"Ваша компания {company_name} успешно прошла верификацию!",
            data={"company_id": company_id}
        )
    
    async def notify_application_received(
        self,
        user_id: int,
        card_title: str,
        card_id: int,
        applicant_name: str
    ) -> Notification:
        """Уведомление о новом отклике"""
        return await self.create_notification(
            user_id=user_id,
            type="application_received",
            title="Новый отклик",
            message=f"{applicant_name} откликнулся на '{card_title}'",
            data={"card_id": card_id}
        )