# contact_service.py
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
import logging

from app.models.user import User, UserRole
from app.models.contact import Contact, ContactStatus, Recommendation
from app.models.opportunity import Opportunity
from app.models.notification import Notification, NotificationType
from app.schemas.contact import ContactResponse, RecommendationResponse
from app.schemas.user import UserShort

# Настройка логгера
logger = logging.getLogger(__name__)


class ContactService:
    """Сервис для работы с контактами и рекомендациями."""
    
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.user = current_user
    
    async def get_contacts(self) -> Tuple[List[ContactResponse], int]:
        """Получить список принятых контактов текущего пользователя."""
        result = await self.db.execute(
            select(Contact)
            .options(
                selectinload(Contact.user),
                selectinload(Contact.contact),
            )
            .where(
                Contact.status == ContactStatus.ACCEPTED,
                or_(
                    Contact.user_id == self.user.id,
                    Contact.contact_id == self.user.id,
                ),
            )
            .order_by(Contact.created_at.desc())
        )
        contacts = result.scalars().unique().all()
        
        items = []
        for contact in contacts:
            if contact.user_id == self.user.id:
                friend = contact.contact
            else:
                friend = contact.user
            
            items.append(ContactResponse(
                id=contact.id,
                user=UserShort(
                    id=self.user.id,
                    display_name=self.user.display_name,
                    role=self.user.role,
                    avatar_url=self.user.avatar_url,
                    email=self.user.email,
                    first_name=self.user.first_name,
                    last_name=self.user.last_name,
                ),
                contact=UserShort(
                    id=friend.id,
                    display_name=friend.display_name,
                    role=friend.role,
                    avatar_url=friend.avatar_url,
                    email=friend.email,
                    first_name=friend.first_name,
                    last_name=friend.last_name,
                ),
                status=contact.status,
                created_at=contact.created_at,
            ))
        
        return items, len(items)
    
    async def get_incoming_requests(self) -> Tuple[List[ContactResponse], int]:
        """Получить входящие запросы на добавление в контакты."""
        result = await self.db.execute(
            select(Contact)
            .options(
                selectinload(Contact.user),
                selectinload(Contact.contact),
            )
            .where(
                Contact.contact_id == self.user.id,
                Contact.status == ContactStatus.PENDING,
            )
            .order_by(Contact.created_at.desc())
        )
        contacts = result.scalars().unique().all()
        
        items = []
        for contact in contacts:
            items.append(ContactResponse(
                id=contact.id,
                user=UserShort(
                    id=contact.user.id,
                    display_name=contact.user.display_name,
                    role=contact.user.role,
                    avatar_url=contact.user.avatar_url,
                    email=contact.user.email,
                    first_name=contact.user.first_name,
                    last_name=contact.user.last_name,
                ),
                contact=UserShort(
                    id=self.user.id,
                    display_name=self.user.display_name,
                    role=self.user.role,
                    avatar_url=self.user.avatar_url,
                    email=self.user.email,
                    first_name=self.user.first_name,
                    last_name=self.user.last_name,
                ),
                status=contact.status,
                created_at=contact.created_at,
            ))
        
        return items, len(items)
    
    async def get_outgoing_requests(self) -> Tuple[List[ContactResponse], int]:
        """Получить исходящие запросы на добавление в контакты."""
        result = await self.db.execute(
            select(Contact)
            .options(
                selectinload(Contact.user),
                selectinload(Contact.contact),
            )
            .where(
                Contact.user_id == self.user.id,
                Contact.status == ContactStatus.PENDING,
            )
            .order_by(Contact.created_at.desc())
        )
        contacts = result.scalars().unique().all()
        
        items = []
        for contact in contacts:
            items.append(ContactResponse(
                id=contact.id,
                user=UserShort(
                    id=self.user.id,
                    display_name=self.user.display_name,
                    role=self.user.role,
                    avatar_url=self.user.avatar_url,
                    email=self.user.email,
                    first_name=self.user.first_name,
                    last_name=self.user.last_name,
                ),
                contact=UserShort(
                    id=contact.contact.id,
                    display_name=contact.contact.display_name,
                    role=contact.contact.role,
                    avatar_url=contact.contact.avatar_url,
                    email=contact.contact.email,
                    first_name=contact.contact.first_name,
                    last_name=contact.contact.last_name,
                ),
                status=contact.status,
                created_at=contact.created_at,
            ))
        
        return items, len(items)
    
    async def send_contact_request(self, target_user_id: int) -> str:
        """Отправить запрос на добавление в контакты."""
        logger.info(f"User {self.user.id} ({self.user.role}) sending request to user {target_user_id}")
        
        # Проверка на добавление самого себя
        if target_user_id == self.user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя добавить себя в контакты",
            )
        
        # Проверяем существование и роль целевого пользователя
        target = await self._get_student_user(target_user_id)
        
        # Проверяем существующие отношения
        existing_contact = await self._get_existing_contact(target_user_id)
        
        if existing_contact:
            return await self._handle_existing_contact(existing_contact, target_user_id)
        
        # Создаём новый запрос
        contact = Contact(
            user_id=self.user.id,
            contact_id=target_user_id,
            status=ContactStatus.PENDING,
        )
        self.db.add(contact)
        
        # Создаём уведомление
        await self._create_notification(
            user_id=target_user_id,
            notification_type=NotificationType.CONTACT_REQUEST,
            title="Запрос в контакты",
            message=f"{self.user.display_name} хочет добавить вас в контакты",
            link="/student/contacts",
        )
        
        await self.db.commit()
        logger.info(f"Contact request sent successfully from {self.user.id} to {target_user_id}")
        return "Запрос отправлен"
    
    async def accept_contact_request(self, contact_id: int) -> str:
        """Принять входящий запрос в контакты."""
        contact = await self._get_pending_contact(contact_id, as_receiver=True)
        
        contact.status = ContactStatus.ACCEPTED
        
        # Уведомление отправителю
        await self._create_notification(
            user_id=contact.user_id,
            notification_type=NotificationType.CONTACT_ACCEPTED,
            title="Запрос принят",
            message=f"{self.user.display_name} принял ваш запрос в контакты",
            link="/student/contacts",
        )
        
        await self.db.commit()
        return "Контакт добавлен"
    
    async def reject_contact_request(self, contact_id: int) -> str:
        """Отклонить входящий запрос в контакты."""
        contact = await self._get_pending_contact(contact_id, as_receiver=True)
        
        contact.status = ContactStatus.REJECTED
        await self.db.commit()
        
        return "Запрос отклонён"
    
    async def remove_contact(self, contact_id: int) -> str:
        """Удалить пользователя из контактов."""
        result = await self.db.execute(
            select(Contact).where(
                Contact.id == contact_id,
                or_(
                    Contact.user_id == self.user.id,
                    Contact.contact_id == self.user.id,
                ),
            )
        )
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Контакт не найден",
            )
        
        await self.db.delete(contact)
        await self.db.commit()
        
        return "Контакт удалён"
    
    async def recommend_contact(
        self,
        to_user_id: int,
        opportunity_id: int,
        message: Optional[str] = None
    ) -> str:
        """Рекомендовать контакт на вакансию."""
        # Проверка на рекомендацию себя
        if to_user_id == self.user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя рекомендовать себя",
            )
        
        # Проверяем, что это принятый контакт
        await self._check_accepted_contact(to_user_id)
        
        # Проверяем существование возможности
        opportunity = await self._get_opportunity(opportunity_id)
        
        # Проверяем дубликат рекомендации
        await self._check_duplicate_recommendation(to_user_id, opportunity_id)
        
        # Создаём рекомендацию
        recommendation = Recommendation(
            from_user_id=self.user.id,
            to_user_id=to_user_id,
            opportunity_id=opportunity_id,
            message=message,
        )
        self.db.add(recommendation)
        
        # Уведомление другу
        await self._create_notification(
            user_id=to_user_id,
            notification_type=NotificationType.RECOMMENDATION,
            title="Рекомендация от друга",
            message=f"{self.user.display_name} рекомендует вам вакансию «{opportunity.title}»",
            link=f"/opportunities/{opportunity.id}",
        )
        
        await self.db.commit()
        
        return "Рекомендация отправлена"
    
    async def get_my_recommendations(self) -> List[RecommendationResponse]:
        """Получить список рекомендаций, полученных от контактов."""
        result = await self.db.execute(
            select(Recommendation)
            .options(selectinload(Recommendation.from_user))
            .where(Recommendation.to_user_id == self.user.id)
            .order_by(Recommendation.created_at.desc())
        )
        recommendations = result.scalars().unique().all()
        
        items = []
        for rec in recommendations:
            items.append(RecommendationResponse(
                id=rec.id,
                from_user=UserShort(
                    id=rec.from_user.id,
                    display_name=rec.from_user.display_name,
                    role=rec.from_user.role,
                    avatar_url=rec.from_user.avatar_url,
                    email=rec.from_user.email,
                    first_name=rec.from_user.first_name,
                    last_name=rec.from_user.last_name,
                ),
                opportunity_id=rec.opportunity_id,
                message=rec.message,
                is_read=rec.is_read,
                created_at=rec.created_at,
            ))
        
        return items
    
    async def mark_recommendation_as_read(self, recommendation_id: int) -> bool:
        """Отметить рекомендацию как прочитанную."""
        result = await self.db.execute(
            select(Recommendation).where(
                Recommendation.id == recommendation_id,
                Recommendation.to_user_id == self.user.id,
            )
        )
        recommendation = result.scalar_one_or_none()
        
        if not recommendation:
            return False
        
        recommendation.is_read = True
        await self.db.commit()
        
        return True
    
    # Приватные вспомогательные методы
    
    async def _get_student_user(self, user_id: int) -> User:
        """Получить пользователя с ролью студента."""
        # Сначала получим пользователя
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
        
        # Проверяем, что пользователь активен
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь неактивен",
            )
        
        # Проверяем роль, используя .value для сравнения строк
        if user.role.value != UserRole.STUDENT.value:  # Сравниваем строки
            logger.warning(f"User {user_id} has role {user.role.value}, not student")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Пользователь имеет роль {user.role.value}. Добавлять в контакты можно только студентов",
            )
        
        return user
    
    async def _get_existing_contact(self, target_user_id: int) -> Optional[Contact]:
        """Получить существующий контакт между пользователями."""
        result = await self.db.execute(
            select(Contact).where(
                or_(
                    and_(Contact.user_id == self.user.id, Contact.contact_id == target_user_id),
                    and_(Contact.user_id == target_user_id, Contact.contact_id == self.user.id),
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _handle_existing_contact(
        self,
        existing_contact: Contact,
        target_user_id: int
    ) -> str:
        """Обработать существующий контакт."""
        if existing_contact.status == ContactStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Вы уже в контактах",
            )
        elif existing_contact.status == ContactStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Запрос уже отправлен",
            )
        elif existing_contact.status == ContactStatus.REJECTED:
            # Разрешаем повторный запрос — обновляем статус
            existing_contact.status = ContactStatus.PENDING
            existing_contact.user_id = self.user.id
            existing_contact.contact_id = target_user_id
            await self.db.commit()
            return "Запрос отправлен повторно"
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный статус контакта",
        )
    
    async def _get_pending_contact(self, contact_id: int, as_receiver: bool = True) -> Contact:
        """Получить ожидающий запрос на добавление."""
        query = select(Contact).where(
            Contact.id == contact_id,
            Contact.status == ContactStatus.PENDING,
        )
        
        if as_receiver:
            query = query.where(Contact.contact_id == self.user.id)
        else:
            query = query.where(Contact.user_id == self.user.id)
        
        result = await self.db.execute(query)
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Запрос не найден или уже обработан",
            )
        
        return contact
    
    async def _check_accepted_contact(self, to_user_id: int) -> None:
        """Проверить, что пользователи являются принятыми контактами."""
        result = await self.db.execute(
            select(Contact).where(
                Contact.status == ContactStatus.ACCEPTED,
                or_(
                    and_(Contact.user_id == self.user.id, Contact.contact_id == to_user_id),
                    and_(Contact.user_id == to_user_id, Contact.contact_id == self.user.id),
                ),
            )
        )
        
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Можно рекомендовать только контактам (друзьям)",
            )
    
    async def _get_opportunity(self, opportunity_id: int) -> Opportunity:
        """Получить возможность/вакансию."""
        result = await self.db.execute(
            select(Opportunity).where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one_or_none()
        
        if not opportunity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Возможность не найдена",
            )
        
        return opportunity
    
    async def _check_duplicate_recommendation(self, to_user_id: int, opportunity_id: int) -> None:
        """Проверить, не существует ли уже такой рекомендации."""
        result = await self.db.execute(
            select(Recommendation).where(
                Recommendation.from_user_id == self.user.id,
                Recommendation.to_user_id == to_user_id,
                Recommendation.opportunity_id == opportunity_id,
            )
        )
        
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Вы уже рекомендовали этого пользователя на эту возможность",
            )
    
    async def _create_notification(
        self,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        link: str
    ) -> None:
        """Создать уведомление."""
        notification = Notification(
            user_id=user_id,
            type=notification_type.value,  # Используем .value для получения строки
            title=title,
            message=message,
            data={"link": link}
        )
        self.db.add(notification)