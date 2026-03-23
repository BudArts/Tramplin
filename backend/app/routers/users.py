# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.services.user_service import user_service
from app.schemas.user import (
    UserResponse,
    UserListResponse,
    UserUpdate
)
from app.schemas.common import PaginatedResponse
from app.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole, UserStatus

router = APIRouter(prefix="/users", tags=["Users"])


# ==================== Текущий пользователь ====================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Мой профиль"
)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Получение профиля текущего пользователя"""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Обновить мой профиль"
)
async def update_my_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление профиля текущего пользователя.
    
    Можно обновить:
    - ФИО
    - Телефон
    - Университет, факультет, курс (для студентов)
    - Биографию
    """
    try:
        user = await user_service.update_user(
            db, 
            current_user.id, 
            update_data,
            updated_by=current_user.id
        )
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/me",
    summary="Удалить мой аккаунт"
)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Удаление собственного аккаунта.
    
    Это мягкое удаление - данные анонимизируются, но не удаляются полностью.
    """
    await user_service.delete_user(
        db,
        current_user.id,
        deleted_by=current_user.id,
        hard_delete=False
    )
    return {"message": "Аккаунт успешно удалён"}


# ==================== Список пользователей ====================

@router.get(
    "/",
    response_model=PaginatedResponse,
    summary="Список пользователей"
)
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    search: Optional[str] = None,
    is_verified: Optional[bool] = None,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка пользователей.
    
    Доступно только администраторам и кураторам.
    """
    users, total = await user_service.get_users(
        db,
        skip=skip,
        limit=limit,
        role=role,
        status=status,
        search=search,
        is_verified=is_verified
    )
    
    return PaginatedResponse(
        items=[UserListResponse.model_validate(u) for u in users],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/students",
    response_model=PaginatedResponse,
    summary="Список студентов"
)
async def get_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    university: Optional[str] = None,
    faculty: Optional[str] = None,
    course: Optional[int] = Query(None, ge=1, le=6),
    has_resume: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка студентов.
    
    Доступно компаниям для поиска кандидатов.
    """
    # Проверяем права (компании, кураторы, админы)
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Студенты не имеют доступа к списку других студентов"
        )
    
    students, total = await user_service.get_students(
        db,
        skip=skip,
        limit=limit,
        university=university,
        faculty=faculty,
        course=course,
        has_resume=has_resume,
        search=search
    )
    
    return PaginatedResponse(
        items=[UserListResponse.model_validate(s) for s in students],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/universities",
    summary="Список университетов"
)
async def get_universities(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка университетов с количеством студентов.
    
    Для фильтров поиска.
    """
    universities = await user_service.get_universities_list(db, limit)
    return {"universities": universities}


@router.get(
    "/stats",
    summary="Статистика пользователей"
)
async def get_users_stats(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    Статистика по пользователям.
    
    Только для администраторов.
    """
    stats = await user_service.get_user_stats(db)
    return stats


# ==================== Конкретный пользователь ====================

@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Профиль пользователя"
)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение профиля конкретного пользователя.
    
    Студенты могут видеть только свой профиль.
    Компании могут видеть профили студентов.
    Админы и кураторы могут видеть всех.
    """
    user = await user_service.get_user_by_id(db, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Проверка прав доступа
    if current_user.role == UserRole.STUDENT:
        if current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этому профилю"
            )
    elif current_user.role == UserRole.COMPANY:
        # Компании видят только активных студентов
        if user.role != UserRole.STUDENT or user.status != UserStatus.ACTIVE:
            if current_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нет доступа к этому профилю"
                )
    
    return UserResponse.model_validate(user)


# ==================== Административные функции ====================

@router.post(
    "/{user_id}/suspend",
    summary="Заблокировать пользователя"
)
async def suspend_user(
    user_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """
    Блокировка пользователя.
    
    Доступно администраторам и кураторам.
    """
    try:
        user = await user_service.suspend_user(
            db, user_id, current_user.id, reason
        )
        return {
            "message": f"Пользователь {user.email} заблокирован",
            "user_id": user.id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{user_id}/activate",
    summary="Активировать пользователя"
)
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.CURATOR])),
    db: AsyncSession = Depends(get_db)
):
    """
    Активация (разблокировка) пользователя.
    """
    try:
        user = await user_service.activate_user(db, user_id, current_user.id)
        return {
            "message": f"Пользователь {user.email} активирован",
            "user_id": user.id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch(
    "/{user_id}/role",
    summary="Изменить роль пользователя"
)
async def change_user_role(
    user_id: int,
    new_role: UserRole,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    Изменение роли пользователя.
    
    Только для администраторов.
    """
    try:
        user = await user_service.change_user_role(
            db, user_id, new_role, current_user.id
        )
        return {
            "message": f"Роль пользователя изменена на {new_role.value}",
            "user_id": user.id,
            "new_role": new_role.value
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{user_id}",
    summary="Удалить пользователя"
)
async def delete_user(
    user_id: int,
    hard_delete: bool = False,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    Удаление пользователя.
    
    - soft delete (по умолчанию): анонимизация данных
    - hard delete: полное удаление (осторожно!)
    """
    try:
        await user_service.delete_user(
            db, user_id, current_user.id, hard_delete
        )
        return {
            "message": "Пользователь удалён",
            "hard_delete": hard_delete
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )