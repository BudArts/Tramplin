# backend/app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole, UserStatus

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Получение текущего авторизованного пользователя"""
    from app.services.auth_service import auth_service
    
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен авторизации",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется access token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = await auth_service.get_user_by_id(db, payload.sub)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован"
        )
    
    if user.status == UserStatus.DELETED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Аккаунт удалён"
        )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Опциональное получение пользователя"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_roles(allowed_roles: List[UserRole]):
    """
    Проверка ролей (список).
    
    Использование:
        @router.get("/admin")
        async def admin_only(user: User = Depends(require_roles([UserRole.ADMIN]))):
    """
    async def check_role(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join([r.value for r in allowed_roles])}"
            )
        return current_user
    return check_role


def require_role(*roles: UserRole):
    """
    Проверка ролей (аргументы).
    
    Использование:
        @router.get("/admin")
        async def admin_only(user: User = Depends(require_role(UserRole.CURATOR, UserRole.ADMIN))):
    """
    allowed_roles = list(roles)
    
    async def check_role(
        current_user: User = Depends(get_current_user)
    ) -> User:
        # Нормализуем роли (APPLICANT -> STUDENT, EMPLOYER -> COMPANY)
        user_role = current_user.role
        if user_role == UserRole.APPLICANT:
            user_role = UserRole.STUDENT
        if user_role == UserRole.EMPLOYER:
            user_role = UserRole.COMPANY
            
        normalized_allowed = []
        for role in allowed_roles:
            if role == UserRole.APPLICANT:
                normalized_allowed.append(UserRole.STUDENT)
            elif role == UserRole.EMPLOYER:
                normalized_allowed.append(UserRole.COMPANY)
            else:
                normalized_allowed.append(role)
        
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join([r.value for r in allowed_roles])}"
            )
        return current_user
    return check_role


def require_verified_email():
    """Проверка что email подтверждён"""
    async def check_verified(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if not current_user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Требуется подтверждение email"
            )
        return current_user
    return check_verified


# Алиасы для обратной совместимости
get_current_active_user = get_current_user