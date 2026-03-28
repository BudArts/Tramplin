# backend/app/services/opportunity_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from datetime import datetime, timezone

from app.models.opportunity import Opportunity, OpportunityStatus, ModerationStatus
from app.models.tag import Tag, opportunity_tags
from app.models.company import Company
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate


class OpportunityService:
    """Сервис для работы с возможностями (вакансиями)"""
    
    async def create_opportunity(
        self,
        db: AsyncSession,
        data: OpportunityCreate,
        user_id: int,
        company_id: int
    ) -> Opportunity:
        """Создание новой возможности"""
        # Создаем возможность
        opportunity = Opportunity(
            title=data.title,
            description=data.description,
            type=data.type,
            work_format=data.work_format,
            salary_min=data.salary_min,
            salary_max=data.salary_max,
            city=data.city,
            address=data.address,
            latitude=data.latitude,
            longitude=data.longitude,
            expires_at=data.expires_at,
            event_date=data.event_date,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            external_url=data.external_url,
            company_id=company_id,
            status=OpportunityStatus.PENDING_MODERATION,
            moderation_status=ModerationStatus.PENDING,
            views_count=0,
            applications_count=0,
        )
        
        db.add(opportunity)
        await db.flush()
        
        # Добавляем теги через ассоциативную таблицу
        if data.tag_ids:
            for tag_id in data.tag_ids:
                tag_result = await db.execute(
                    select(Tag).where(Tag.id == tag_id)
                )
                tag = tag_result.scalar_one_or_none()
                if tag:
                    await db.execute(
                        opportunity_tags.insert().values(
                            opportunity_id=opportunity.id,
                            tag_id=tag_id
                        )
                    )
        
        await db.commit()
        
        # Загружаем созданную возможность с тегами и компанией
        result = await db.execute(
            select(Opportunity)
            .options(
                selectinload(Opportunity.tags),
                selectinload(Opportunity.company)
            )
            .where(Opportunity.id == opportunity.id)
        )
        opportunity = result.scalar_one()
        
        return opportunity
    
    async def update_opportunity(
        self,
        db: AsyncSession,
        opportunity_id: int,
        data: OpportunityUpdate,
        user_id: int
    ) -> Opportunity:
        """Обновление возможности"""
        # Загружаем возможность с тегами и компанией
        result = await db.execute(
            select(Opportunity)
            .options(
                selectinload(Opportunity.tags),
                selectinload(Opportunity.company)
            )
            .where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one_or_none()
        
        if not opportunity:
            raise ValueError(f"Возможность с ID {opportunity_id} не найдена")
        
        # Применяем обновления
        update_dict = data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            if field == 'tag_ids' and value is not None:
                # Обновляем теги - сначала удаляем старые
                await db.execute(
                    opportunity_tags.delete().where(
                        opportunity_tags.c.opportunity_id == opportunity_id
                    )
                )
                # Добавляем новые
                for tag_id in value:
                    tag_result = await db.execute(
                        select(Tag).where(Tag.id == tag_id)
                    )
                    tag = tag_result.scalar_one_or_none()
                    if tag:
                        await db.execute(
                            opportunity_tags.insert().values(
                                opportunity_id=opportunity_id,
                                tag_id=tag_id
                            )
                        )
            elif hasattr(opportunity, field) and value is not None:
                setattr(opportunity, field, value)
        
        opportunity.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # Загружаем обновленную возможность с тегами и компанией
        result = await db.execute(
            select(Opportunity)
            .options(
                selectinload(Opportunity.tags),
                selectinload(Opportunity.company)
            )
            .where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one()
        
        return opportunity
    
    async def get_opportunity_by_id(
        self,
        db: AsyncSession,
        opportunity_id: int
    ) -> Optional[Opportunity]:
        """Получить возможность по ID"""
        result = await db.execute(
            select(Opportunity)
            .options(
                selectinload(Opportunity.tags),
                selectinload(Opportunity.company)
            )
            .where(Opportunity.id == opportunity_id)
        )
        return result.scalar_one_or_none()
    
    async def get_company_opportunities(
        self,
        db: AsyncSession,
        company_id: int,
        status: Optional[str] = None
    ) -> List[Opportunity]:
        """Получить все возможности компании"""
        query = select(Opportunity).where(Opportunity.company_id == company_id)
        
        if status:
            query = query.where(Opportunity.status == status)
        
        query = query.order_by(Opportunity.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_opportunities_list(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        type_filter: Optional[str] = None,
        work_format: Optional[str] = None,
        city: Optional[str] = None,
        company_id: Optional[int] = None,
        sort: str = "published_at",
        order: str = "desc"
    ) -> Tuple[List[Opportunity], int]:
        """Получить список возможностей с фильтрацией"""
        query = select(Opportunity).where(
            Opportunity.status == OpportunityStatus.ACTIVE,
            Opportunity.moderation_status == ModerationStatus.APPROVED
        )
        
        if search:
            query = query.where(Opportunity.title.ilike(f"%{search}%"))
        
        if type_filter:
            query = query.where(Opportunity.type == type_filter)
        
        if work_format:
            query = query.where(Opportunity.work_format == work_format)
        
        if city:
            query = query.where(Opportunity.city == city)
        
        if company_id:
            query = query.where(Opportunity.company_id == company_id)
        
        # Сортировка
        order_column = getattr(Opportunity, sort, Opportunity.created_at)
        if order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # Подсчет общего количества
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        # Пагинация
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(
            query.options(
                selectinload(Opportunity.tags),
                selectinload(Opportunity.company)
            )
        )
        opportunities = result.scalars().all()
        
        return opportunities, total
    
    async def delete_opportunity(
        self,
        db: AsyncSession,
        opportunity_id: int
    ) -> bool:
        """Мягкое удаление возможности"""
        result = await db.execute(
            select(Opportunity).where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one_or_none()
        
        if not opportunity:
            return False
        
        opportunity.status = OpportunityStatus.CLOSED
        opportunity.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        return True
    
    async def update_status(
        self,
        db: AsyncSession,
        opportunity_id: int,
        status: OpportunityStatus
    ) -> Opportunity:
        """Обновить статус возможности"""
        result = await db.execute(
            select(Opportunity).where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one_or_none()
        
        if not opportunity:
            raise ValueError(f"Возможность с ID {opportunity_id} не найдена")
        
        opportunity.status = status
        opportunity.updated_at = datetime.now(timezone.utc)
        
        if status == OpportunityStatus.ACTIVE:
            opportunity.published_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # Загружаем обновленную возможность с тегами и компанией
        result = await db.execute(
            select(Opportunity)
            .options(
                selectinload(Opportunity.tags),
                selectinload(Opportunity.company)
            )
            .where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one()
        
        return opportunity
    
    async def increment_views(
        self,
        db: AsyncSession,
        opportunity_id: int
    ) -> None:
        """Увеличить счетчик просмотров"""
        result = await db.execute(
            select(Opportunity).where(Opportunity.id == opportunity_id)
        )
        opportunity = result.scalar_one_or_none()
        
        if opportunity:
            opportunity.views_count += 1
            await db.commit()


# Создаем экземпляр сервиса
opportunity_service = OpportunityService()