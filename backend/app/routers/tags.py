from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.tag import Tag, TagCategory, TagSynonym
from app.schemas.tag import TagResponse, TagCreate
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/tags", tags=["Теги"])


@router.get(
    "",
    response_model=list[TagResponse],
    summary="Список тегов",
)
async def list_tags(
    db: AsyncSession = Depends(get_db),
    category: Optional[TagCategory] = None,
    approved_only: bool = True,
):
    """Список утверждённых тегов, с фильтрацией по категории."""
    query = select(Tag)

    if approved_only:
        query = query.where(Tag.is_approved == True)

    if category:
        query = query.where(Tag.category == category)

    query = query.order_by(Tag.usage_count.desc(), Tag.name)

    result = await db.execute(query)
    return result.scalars().all()


@router.get(
    "/popular",
    response_model=list[TagResponse],
    summary="Популярные теги",
)
async def popular_tags(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """Топ тегов по количеству использований."""
    result = await db.execute(
        select(Tag)
        .where(Tag.is_approved == True)
        .order_by(Tag.usage_count.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get(
    "/suggest",
    response_model=list[TagResponse],
    summary="Автоподсказка тегов",
)
async def suggest_tags(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Автоподсказка при вводе.
    Ищет по имени тега и синонимам.
    """
    search = f"%{q}%"

    # Ищем по имени тега
    tag_query = (
        select(Tag)
        .where(Tag.is_approved == True, Tag.name.ilike(search))
        .order_by(Tag.usage_count.desc())
        .limit(limit)
    )
    result = await db.execute(tag_query)
    tags = list(result.scalars().all())

    # Если мало результатов — ищем по синонимам
    if len(tags) < limit:
        synonym_result = await db.execute(
            select(TagSynonym.tag_id)
            .where(TagSynonym.synonym.ilike(search))
            .limit(limit - len(tags))
        )
        synonym_tag_ids = [row[0] for row in synonym_result.all()]

        if synonym_tag_ids:
            existing_ids = {t.id for t in tags}
            new_ids = [tid for tid in synonym_tag_ids if tid not in existing_ids]
            if new_ids:
                extra_result = await db.execute(
                    select(Tag).where(Tag.id.in_(new_ids))
                )
                tags.extend(extra_result.scalars().all())

    return tags


@router.post(
    "",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Предложить новый тег",
)
async def propose_tag(
    data: TagCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Предложить новый тег.
    Тег создаётся с is_approved=False и ожидает одобрения куратором.
    """
    # Проверяем уникальность
    existing = await db.execute(
        select(Tag).where(func.lower(Tag.name) == data.name.lower().strip())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Тег с таким именем уже существует",
        )

    tag = Tag(
        name=data.name.strip(),
        category=data.category,
        is_approved=False,
        created_by=user.id,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)

    return tag