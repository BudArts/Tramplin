# backend/app/routers/companies.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, text
from typing import List, Optional

from app.database import get_db
from app.schemas.company import (
    CompanyResponse,
    CompanyListResponse,
    CompanyUpdate,
)
from app.schemas.auth import MessageResponse
from app.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus
from app.models.opportunity import Opportunity
from app.models.recommendation import Recommendation

router = APIRouter(prefix="/companies", tags=["Companies"])


# ============== СПЕЦИФИЧНЫЕ МАРШРУТЫ (ДОЛЖНЫ БЫТЬ ПЕРВЫМИ) ==============

@router.get(
    "/recommendations",
    response_model=List[dict],
    summary="Рекомендации для компании"
)
async def get_company_recommendations(
    current_user: User = Depends(require_roles([UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db)
):
    """Получение списка рекомендаций для компании."""
    if not current_user.company_id:
        return []
    
    # Получаем все вакансии компании
    opportunities_query = select(Opportunity.id).where(
        Opportunity.company_id == current_user.company_id
    )
    opportunities_result = await db.execute(opportunities_query)
    opportunity_ids = [row[0] for row in opportunities_result.fetchall()]
    
    if not opportunity_ids:
        return []
    
    # Формируем список плейсхолдеров для IN запроса
    placeholders = ', '.join([f':id_{i}' for i in range(len(opportunity_ids))])
    params = {f'id_{i}': opp_id for i, opp_id in enumerate(opportunity_ids)}
    
    sql = text(f"""
        SELECT r.id, r.from_user_id, r.to_user_id, r.opportunity_id, 
               r.message, r.is_read, r.created_at,
               u_from.id as from_id, u_from.first_name as from_first_name, 
               u_from.last_name as from_last_name, u_from.display_name as from_display_name,
               u_from.avatar_url as from_avatar_url, u_from.university as from_university,
               u_to.id as to_id, u_to.first_name as to_first_name, 
               u_to.last_name as to_last_name, u_to.display_name as to_display_name,
               u_to.avatar_url as to_avatar_url, u_to.university as to_university,
               u_to.email as to_email, u_to.phone as to_phone,
               o.title as opportunity_title
        FROM recommendations r
        LEFT JOIN users u_from ON r.from_user_id = u_from.id
        LEFT JOIN users u_to ON r.to_user_id = u_to.id
        LEFT JOIN opportunities o ON r.opportunity_id = o.id
        WHERE r.opportunity_id IN ({placeholders})
        ORDER BY r.created_at DESC
    """)
    
    result = await db.execute(sql, params)
    rows = result.fetchall()
    
    # Формируем ответ
    recommendations_list = []
    for row in rows:
        recommendations_list.append({
            "id": row.id,
            "from_user": {
                "id": row.from_id,
                "first_name": row.from_first_name,
                "last_name": row.from_last_name,
                "display_name": row.from_display_name,
                "avatar_url": row.from_avatar_url,
                "university": row.from_university,
            },
            "recommended_user": {
                "id": row.to_id,
                "first_name": row.to_first_name,
                "last_name": row.to_last_name,
                "display_name": row.to_display_name,
                "avatar_url": row.to_avatar_url,
                "university": row.to_university,
                "email": row.to_email,
                "phone": row.to_phone,
            },
            "opportunity_id": row.opportunity_id,
            "opportunity_title": row.opportunity_title,
            "message": row.message,
            "is_read": row.is_read,
            "created_at": row.created_at,
        })
    
    return recommendations_list


@router.get(
    "/recommendations/unread-count",
    response_model=dict,
    summary="Количество непрочитанных рекомендаций"
)
async def get_unread_recommendations_count(
    current_user: User = Depends(require_roles([UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db)
):
    """Получение количества непрочитанных рекомендаций для компании."""
    if not current_user.company_id:
        return {"count": 0}
    
    opportunities_query = select(Opportunity.id).where(
        Opportunity.company_id == current_user.company_id
    )
    opportunities_result = await db.execute(opportunities_query)
    opportunity_ids = [row[0] for row in opportunities_result.fetchall()]
    
    if not opportunity_ids:
        return {"count": 0}
    
    placeholders = ', '.join([f':id_{i}' for i in range(len(opportunity_ids))])
    params = {f'id_{i}': opp_id for i, opp_id in enumerate(opportunity_ids)}
    
    sql = text(f"""
        SELECT COUNT(*) FROM recommendations 
        WHERE opportunity_id IN ({placeholders}) AND is_read = false
    """)
    
    result = await db.execute(sql, params)
    count = result.scalar() or 0
    
    return {"count": count}

@router.patch(
    "/recommendations/{recommendation_id}/read",
    response_model=MessageResponse,
    summary="Отметить рекомендацию как прочитанную"
)
async def mark_recommendation_as_read(
    recommendation_id: int,
    current_user: User = Depends(require_roles([UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Отметить рекомендацию как прочитанную.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к этой рекомендации"
        )
    
    # Получаем рекомендацию и проверяем доступ
    sql_check = text("""
        SELECT r.id, r.opportunity_id, o.company_id
        FROM recommendations r
        LEFT JOIN opportunities o ON r.opportunity_id = o.id
        WHERE r.id = :rec_id
    """)
    
    result = await db.execute(sql_check, {"rec_id": recommendation_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Рекомендация не найдена"
        )
    
    if row.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к этой рекомендации"
        )
    
    # Отмечаем как прочитанную
    sql_update = text("""
        UPDATE recommendations 
        SET is_read = true 
        WHERE id = :rec_id
    """)
    
    await db.execute(sql_update, {"rec_id": recommendation_id})
    await db.commit()
    
    return MessageResponse(
        message="Рекомендация отмечена как прочитанная",
        success=True
    )


@router.get(
    "/moderation/pending",
    response_model=List[CompanyResponse],
    summary="Компании на модерации"
)
async def get_pending_companies(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """Получение списка компаний, ожидающих модерацию."""
    from app.services.company_service import company_service
    
    companies = await company_service.get_companies_for_moderation(db, skip, limit)
    return [CompanyResponse.model_validate(c) for c in companies]


@router.get(
    "/top-rated/",
    response_model=List[CompanyResponse],
    summary="Топ компаний по рейтингу"
)
async def get_top_rated_companies(
    limit: int = 3,
    db: AsyncSession = Depends(get_db)
):
    """Получение топ-компаний по рейтингу."""
    from sqlalchemy import desc
    
    query = select(Company).where(
        Company.status == CompanyStatus.ACTIVE,
        Company.is_email_verified == True
    ).order_by(
        desc(Company.rating),
        desc(Company.reviews_count)
    ).limit(limit)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [CompanyResponse.model_validate(c) for c in companies]


# ============== ДИНАМИЧЕСКИЕ МАРШРУТЫ (С ПАРАМЕТРАМИ) ==============

@router.get(
    "/",
    response_model=List[CompanyListResponse],
    summary="Список компаний"
)
async def get_companies(
    skip: int = 0,
    limit: int = 20,
    industry: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Получение списка активных компаний."""
    query = select(Company).where(Company.status == CompanyStatus.ACTIVE)
    
    if industry:
        query = query.where(Company.industry.ilike(f"%{industry}%"))
    
    query = query.order_by(Company.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [CompanyListResponse.model_validate(c) for c in companies]


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Детали компании"
)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получение детальной информации о компании."""
    from app.services.company_service import company_service
    
    company = await company_service.get_company_by_id(db, company_id)
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    return CompanyResponse.model_validate(company)


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Обновление данных компании"
)
async def update_company(
    company_id: int,
    update_data: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновление данных компании."""
    from app.services.company_service import company_service
    
    if current_user.role not in [UserRole.ADMIN, UserRole.CURATOR]:
        if current_user.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет прав для редактирования этой компании"
            )
    
    try:
        company = await company_service.update_company(db, company_id, update_data)
        return CompanyResponse.model_validate(company)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{company_id}",
    response_model=MessageResponse,
    summary="Удалить компанию"
)
async def delete_company(
    company_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """Удаление компании (только для администраторов и кураторов)."""
    from app.services.company_service import company_service
    
    company = await company_service.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Компания не найдена"
        )
    
    try:
        await company_service.delete_company(db, company_id)
        return MessageResponse(
            message=f"Компания '{company.full_name}' успешно удалена",
            success=True,
            data={"company_id": company_id}
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении компании: {str(e)}"
        )


@router.post(
    "/{company_id}/approve",
    response_model=MessageResponse,
    summary="Одобрить компанию"
)
async def approve_company(
    company_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """Одобрение компании после модерации."""
    from app.services.company_service import company_service
    
    try:
        await company_service.approve_company(db, company_id, current_user.id)
        return MessageResponse(
            message="Компания успешно одобрена и активирована",
            success=True
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{company_id}/reject",
    response_model=MessageResponse,
    summary="Отклонить компанию"
)
async def reject_company(
    company_id: int,
    reason: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """Отклонение компании с указанием причины."""
    from app.services.company_service import company_service
    
    if not reason or len(reason) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите причину отклонения (минимум 10 символов)"
        )
    
    try:
        await company_service.reject_company(db, company_id, reason, current_user.id)
        return MessageResponse(
            message="Компания отклонена, уведомление отправлено",
            success=True
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )