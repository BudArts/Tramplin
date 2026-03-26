# backend/app/services/user_service.py
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from datetime import datetime

from app.models.user import User, UserStatus, UserRole
from app.models.company import Company
from app.schemas.user import UserUpdate
import logging

logger = logging.getLogger(__name__)


class UserService:
    """Сервис для работы с пользователями"""
    
    # ==================== CRUD операции ====================
    
    async def get_user_by_id(
        self,
        db: AsyncSession,
        user_id: int
    ) -> Optional[User]:
        """Получение пользователя по ID"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_email(
        self,
        db: AsyncSession,
        email: str
    ) -> Optional[User]:
        """Получение пользователя по email"""
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()
    
    async def get_users(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
        search: Optional[str] = None,
        is_verified: Optional[bool] = None,
        company_id: Optional[int] = None,
        order_by: str = "created_at",
        order_desc: bool = True,
        include_deleted: bool = False          # ← ДОБАВЛЕНО
    ) -> Tuple[List[User], int]:
        """
        Получение списка пользователей с фильтрацией и пагинацией.
        
        Args:
            include_deleted: Если False — удалённые пользователи скрываются
        
        Returns:
            Tuple[List[User], int]: (список пользователей, общее количество)
        """
        # Базовый запрос
        query = select(User)
        count_query = select(func.count(User.id))
        
        # Применяем фильтры
        filters = []
        
        # ==========================================
        # Скрываем удалённых по умолчанию
        # ==========================================
        if not include_deleted and status != UserStatus.DELETED:
            filters.append(User.status != UserStatus.DELETED)
        
        if role:
            filters.append(User.role == role)
        
        if status:
            filters.append(User.status == status)
        
        if is_verified is not None:
            filters.append(User.is_email_verified == is_verified)
        
        if company_id:
            filters.append(User.company_id == company_id)
        
        if search:
            search_pattern = f"%{search.lower()}%"
            filters.append(
                or_(
                    User.email.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.phone.ilike(search_pattern)
                )
            )
        
        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))
        
        # Получаем общее количество
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Сортировка
        order_column = getattr(User, order_by, User.created_at)
        if order_desc:
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # Пагинация
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        users = result.scalars().all()
        
        return users, total
    
    # backend/app/services/user_service.py - только метод update_user

    async def update_user(
        self,
        db: AsyncSession,
        user_id: int,
        update_data: UserUpdate,
        updated_by: Optional[int] = None
    ) -> User:
        """
        Обновление профиля пользователя.
        """
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        # Применяем обновления
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Логируем что обновляем
        logger.info(f"Updating user {user_id} with fields: {list(update_dict.keys())}")
        
        for field, value in update_dict.items():
            if hasattr(user, field):
                setattr(user, field, value)
                logger.debug(f"Set {field} = {value}")
        
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(
            f"User {user_id} updated by {updated_by or 'self'}. "
            f"Fields: {list(update_dict.keys())}"
        )
        
        return user
        
    async def update_avatar(
        self,
        db: AsyncSession,
        user_id: int,
        avatar_url: str
    ) -> User:
        """Обновление аватара пользователя"""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        user.avatar_url = avatar_url
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        return user
    
    async def update_resume(
        self,
        db: AsyncSession,
        user_id: int,
        resume_url: str
    ) -> User:
        """Обновление резюме пользователя"""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        if user.role != UserRole.STUDENT:
            raise ValueError("Резюме доступно только для студентов")
        
        user.resume_url = resume_url
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        return user
    
    # ==================== Управление статусом ====================
    
    async def suspend_user(
        self,
        db: AsyncSession,
        user_id: int,
        admin_id: int,
        reason: Optional[str] = None
    ) -> User:
        """Блокировка пользователя."""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        if user.role == UserRole.ADMIN:
            raise ValueError("Невозможно заблокировать администратора")
        
        if user.status == UserStatus.SUSPENDED:
            raise ValueError("Пользователь уже заблокирован")
        
        user.status = UserStatus.SUSPENDED
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.warning(
            f"User {user_id} ({user.email}) suspended by admin {admin_id}. "
            f"Reason: {reason or 'Not specified'}"
        )
        
        return user
    
    async def activate_user(
        self,
        db: AsyncSession,
        user_id: int,
        admin_id: int
    ) -> User:
        """Активация пользователя (снятие блокировки)."""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        if not user.is_email_verified:
            raise ValueError(
                "Невозможно активировать пользователя: email не подтверждён"
            )
        
        if user.status == UserStatus.ACTIVE:
            raise ValueError("Пользователь уже активен")
        
        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User {user_id} ({user.email}) activated by admin {admin_id}")
        
        return user
    
    async def delete_user(
        self,
        db: AsyncSession,
        user_id: int,
        deleted_by: int,
        hard_delete: bool = True              # ← ИЗМЕНЕНО: по умолчанию полное удаление
    ) -> bool:
        """
        Удаление пользователя.
        
        Args:
            user_id: ID удаляемого пользователя
            deleted_by: ID пользователя, выполняющего удаление
            hard_delete: Если True — полное удаление, иначе мягкое
        """
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        if user.role == UserRole.ADMIN:
            raise ValueError("Невозможно удалить администратора")
        
        if hard_delete:
            # ==========================================
            # Полное удаление из БД
            # ==========================================
            email_for_log = user.email
            await db.delete(user)
            await db.commit()
            logger.warning(
                f"User {user_id} ({email_for_log}) HARD DELETED by {deleted_by}"
            )
        else:
            # ==========================================
            # Мягкое удаление с анонимизацией
            # Используем example.com (RFC 2606) вместо .local
            # ==========================================
            user.status = UserStatus.DELETED
            user.updated_at = datetime.utcnow()
            user.email = f"deleted_{user_id}@deleted.example.com"  # ← ИСПРАВЛЕНО
            user.first_name = "Удалённый"
            user.last_name = "Пользователь"
            user.patronymic = None
            user.display_name = None
            user.phone = None
            user.bio = None
            user.avatar_url = None
            user.resume_url = None
            user.github_url = None
            user.portfolio_url = None
            user.telegram = None
            
            await db.commit()
            logger.info(f"User {user_id} soft deleted by {deleted_by}")
        
        return True
    
    # ==================== Управление ролями ====================
    
    async def change_user_role(
        self,
        db: AsyncSession,
        user_id: int,
        new_role: UserRole,
        admin_id: int
    ) -> User:
        """Изменение роли пользователя."""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        old_role = user.role
        
        if old_role == UserRole.ADMIN:
            raise ValueError("Невозможно изменить роль администратора")
        
        if new_role == UserRole.ADMIN:
            admin = await self.get_user_by_id(db, admin_id)
            if not admin or admin.role != UserRole.ADMIN:
                raise ValueError("Недостаточно прав для назначения администратора")
        
        if new_role == UserRole.COMPANY and not user.company_id:
            raise ValueError(
                "Для роли 'company' пользователь должен быть привязан к компании"
            )
        
        user.role = new_role
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(
            f"User {user_id} role changed: {old_role.value} -> {new_role.value} "
            f"by admin {admin_id}"
        )
        
        return user
    
    async def assign_to_company(
        self,
        db: AsyncSession,
        user_id: int,
        company_id: int,
        assigned_by: int
    ) -> User:
        """Привязка пользователя к компании."""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        company_result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = company_result.scalar_one_or_none()
        
        if not company:
            raise ValueError("Компания не найдена")
        
        user.company_id = company_id
        user.role = UserRole.COMPANY
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(
            f"User {user_id} assigned to company {company_id} by {assigned_by}"
        )
        
        return user
    
    async def remove_from_company(
        self,
        db: AsyncSession,
        user_id: int,
        removed_by: int
    ) -> User:
        """Отвязка пользователя от компании."""
        user = await self.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("Пользователь не найден")
        
        if not user.company_id:
            raise ValueError("Пользователь не привязан к компании")
        
        old_company_id = user.company_id
        user.company_id = None
        user.role = UserRole.STUDENT
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(
            f"User {user_id} removed from company {old_company_id} by {removed_by}"
        )
        
        return user
    
    # ==================== Специализированные запросы ====================
    
    async def get_students(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        university: Optional[str] = None,
        faculty: Optional[str] = None,
        course: Optional[int] = None,
        has_resume: Optional[bool] = None,
        search: Optional[str] = None
    ) -> Tuple[List[User], int]:
        """Получение списка студентов с фильтрацией."""
        query = select(User).where(
            User.role == UserRole.STUDENT,
            User.status == UserStatus.ACTIVE,
            User.is_email_verified == True
        )
        count_query = select(func.count(User.id)).where(
            User.role == UserRole.STUDENT,
            User.status == UserStatus.ACTIVE,
            User.is_email_verified == True
        )
        
        filters = []
        
        if university:
            filters.append(User.university.ilike(f"%{university}%"))
        
        if faculty:
            filters.append(User.faculty.ilike(f"%{faculty}%"))
        
        if course:
            filters.append(User.course == course)
        
        if has_resume is True:
            filters.append(User.resume_url.isnot(None))
        elif has_resume is False:
            filters.append(User.resume_url.is_(None))
        
        if search:
            search_pattern = f"%{search.lower()}%"
            filters.append(
                or_(
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.university.ilike(search_pattern),
                    User.faculty.ilike(search_pattern),
                    User.bio.ilike(search_pattern)
                )
            )
        
        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        students = result.scalars().all()
        
        return students, total
    
    async def get_company_employees(
        self,
        db: AsyncSession,
        company_id: int,
        include_inactive: bool = False
    ) -> List[User]:
        """Получение сотрудников компании"""
        query = select(User).where(User.company_id == company_id)
        
        if not include_inactive:
            query = query.where(User.status == UserStatus.ACTIVE)
        else:
            query = query.where(User.status != UserStatus.DELETED)
        
        query = query.order_by(User.created_at)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_curators(
        self,
        db: AsyncSession
    ) -> List[User]:
        """Получение списка кураторов"""
        result = await db.execute(
            select(User).where(
                User.role == UserRole.CURATOR,
                User.status == UserStatus.ACTIVE
            ).order_by(User.last_name, User.first_name)
        )
        return result.scalars().all()
    
    async def get_admins(
        self,
        db: AsyncSession
    ) -> List[User]:
        """Получение списка администраторов"""
        result = await db.execute(
            select(User).where(
                User.role == UserRole.ADMIN,
                User.status == UserStatus.ACTIVE
            ).order_by(User.created_at)
        )
        return result.scalars().all()
    
    # ==================== Статистика ====================
    
    async def get_user_stats(
        self,
        db: AsyncSession
    ) -> dict:
        """Получение статистики по пользователям."""
        role_stats = {}
        for role in UserRole:
            result = await db.execute(
                select(func.count(User.id)).where(
                    User.role == role,
                    User.status != UserStatus.DELETED
                )
            )
            role_stats[role.value] = result.scalar()
        
        status_stats = {}
        for status in UserStatus:
            result = await db.execute(
                select(func.count(User.id)).where(User.status == status)
            )
            status_stats[status.value] = result.scalar()
        
        unverified_result = await db.execute(
            select(func.count(User.id)).where(
                User.is_email_verified == False,
                User.status != UserStatus.DELETED
            )
        )
        unverified_count = unverified_result.scalar()
        
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_users_result = await db.execute(
            select(func.count(User.id)).where(User.created_at >= week_ago)
        )
        new_users_count = new_users_result.scalar()
        
        day_ago = datetime.utcnow() - timedelta(days=1)
        active_result = await db.execute(
            select(func.count(User.id)).where(User.last_login_at >= day_ago)
        )
        active_today_count = active_result.scalar()
        
        return {
            "by_role": role_stats,
            "by_status": status_stats,
            "unverified_emails": unverified_count,
            "new_last_7_days": new_users_count,
            "active_last_24h": active_today_count,
            "total": sum(role_stats.values())
        }
    
    async def get_universities_list(
        self,
        db: AsyncSession,
        limit: int = 50
    ) -> List[dict]:
        """Получение списка университетов с количеством студентов."""
        result = await db.execute(
            select(
                User.university,
                func.count(User.id).label("count")
            ).where(
                User.role == UserRole.STUDENT,
                User.university.isnot(None),
                User.status == UserStatus.ACTIVE
            ).group_by(User.university)
            .order_by(func.count(User.id).desc())
            .limit(limit)
        )
        
        universities = []
        for row in result:
            universities.append({
                "name": row.university,
                "students_count": row.count
            })
        
        return universities
    
    # ==================== Вспомогательные методы ====================
    
    async def check_email_exists(
        self,
        db: AsyncSession,
        email: str,
        exclude_user_id: Optional[int] = None
    ) -> bool:
        """Проверка существования email."""
        query = select(User.id).where(User.email == email.lower())
        
        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)
        
        result = await db.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def search_users(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 10
    ) -> List[User]:
        """Быстрый поиск пользователей по имени/email."""
        if not query or len(query) < 2:
            return []
        
        search_pattern = f"%{query.lower()}%"
        
        result = await db.execute(
            select(User).where(
                User.status == UserStatus.ACTIVE,
                or_(
                    User.email.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern)
                )
            ).limit(limit)
        )
        
        return result.scalars().all()
    
    async def bulk_update_status(
        self,
        db: AsyncSession,
        user_ids: List[int],
        new_status: UserStatus,
        admin_id: int
    ) -> int:
        """Массовое обновление статуса пользователей."""
        from sqlalchemy import update
        
        result = await db.execute(
            update(User)
            .where(
                User.id.in_(user_ids),
                User.role != UserRole.ADMIN
            )
            .values(status=new_status, updated_at=datetime.utcnow())
        )
        
        await db.commit()
        
        updated_count = result.rowcount
        logger.info(
            f"Bulk status update to {new_status.value}: "
            f"{updated_count} users by admin {admin_id}"
        )
        
        return updated_count


# Singleton
user_service = UserService()