from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.company import Company
from app.models.favorite import Favorite, FavoriteCompany
from app.schemas.common import MessageResponse
from app.schemas.opportunity import OpportunityCardResponse
from app.schemas.company import CompanyShort

router = APIRouter(prefix="/api/favorites", tags=["Избранное"])


# === Избранные возможности ===

@router.get(
    "",
    response_model=list[OpportunityCardResponse],
    summary="Мои избранные возможности",
)
async def get_favorite_opportunities(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список избранных возможностей текущего пользователя."""
    result = await db.execute(
        select(Favorite)
        .options(
            joinedload(Favorite.opportunity)
            .joinedload(Opportunity.company),
            joinedload(Favorite.opportunity)
            .selectinload(Opportunity.tags),
        )
        .where(
            Favorite.user_id == user.id,
            Favorite.opportunity_id.isnot(None),
        )
        .order_by(Favorite.created_at.desc())
    )
    favorites = result.unique().scalars().all()

    items = []
    for fav in favorites:
        opp = fav.opportunity
        if opp:
            items.append(OpportunityCardResponse(
                id=opp.id,
                title=opp.title,
                type=opp.type,
                work_format=opp.work_format,
                salary_min=opp.salary_min,
                salary_max=opp.salary_max,
                city=opp.city,
                company_name=opp.company.name if opp.company else None,
                company_logo=opp.company.logo_url if opp.company else None,
                tags=opp.tags if opp.tags else [],
                published_at=opp.published_at,
            ))

    return items


@router.post(
    "/opportunity/{opportunity_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить возможность в избранное",
)
async def add_favorite_opportunity(
    opportunity_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Добавить возможность в избранное."""
    # Проверяем что возможность существует
    opp_result = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )
    if not opp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Возможность не найдена",
        )

    # Проверяем дубликат
    existing = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.opportunity_id == opportunity_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Уже в избранном",
        )

    favorite = Favorite(
        user_id=user.id,
        opportunity_id=opportunity_id,
    )
    db.add(favorite)
    await db.commit()

    return MessageResponse(message="Добавлено в избранное")


@router.delete(
    "/opportunity/{opportunity_id}",
    response_model=MessageResponse,
    summary="Убрать возможность из избранного",
)
async def remove_favorite_opportunity(
    opportunity_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Убрать возможность из избранного."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.opportunity_id == opportunity_id,
        )
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Не найдено в избранном",
        )

    await db.delete(favorite)
    await db.commit()

    return MessageResponse(message="Удалено из избранного")


# === Избранные компании ===

@router.get(
    "/companies",
    response_model=list[CompanyShort],
    summary="Мои избранные компании",
)
async def get_favorite_companies(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список избранных компаний текущего пользователя."""
    result = await db.execute(
        select(FavoriteCompany)
        .options(joinedload(FavoriteCompany.company))
        .where(FavoriteCompany.user_id == user.id)
        .order_by(FavoriteCompany.created_at.desc())
    )
    favorites = result.unique().scalars().all()

    return [fav.company for fav in favorites if fav.company]


@router.post(
    "/company/{company_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить компанию в избранное",
)
async def add_favorite_company(
    company_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Добавить компанию в избранное. Маркеры вакансий этой компании выделяются на карте."""
    # Проверяем что компания существует
    comp_result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    if not comp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена",
        )

    # Проверяем дубликат
    existing = await db.execute(
        select(FavoriteCompany).where(
            FavoriteCompany.user_id == user.id,
            FavoriteCompany.company_id == company_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Компания уже в избранном",
        )

    fav = FavoriteCompany(
        user_id=user.id,
        company_id=company_id,
    )
    db.add(fav)
    await db.commit()

    return MessageResponse(message="Компания добавлена в избранное")


@router.delete(
    "/company/{company_id}",
    response_model=MessageResponse,
    summary="Убрать компанию из избранного",
)
async def remove_favorite_company(
    company_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Убрать компанию из избранного."""
    result = await db.execute(
        select(FavoriteCompany).where(
            FavoriteCompany.user_id == user.id,
            FavoriteCompany.company_id == company_id,
        )
    )
    fav = result.scalar_one_or_none()

    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена в избранном",
        )

    await db.delete(fav)
    await db.commit()

    return MessageResponse(message="Компания удалена из избранного")


@router.get(
    "/companies/ids",
    response_model=list[int],
    summary="ID избранных компаний",
)
async def get_favorite_company_ids(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает список ID избранных компаний (для подсветки маркеров на карте)."""
    result = await db.execute(
        select(FavoriteCompany.company_id).where(
            FavoriteCompany.user_id == user.id
        )
    )
    return [row[0] for row in result.all()]