from fastapi import HTTPException, status
from app.models.user import UserRole


def check_is_owner(resource_owner_id: int, current_user_id: int) -> None:
    """Проверка что текущий пользователь — владелец ресурса."""
    if resource_owner_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для выполнения этого действия",
        )


def check_is_owner_or_curator(
    resource_owner_id: int,
    current_user_id: int,
    current_user_role: UserRole,
) -> None:
    """Владелец или куратор/админ."""
    if resource_owner_id != current_user_id and current_user_role not in (
        UserRole.CURATOR,
        UserRole.ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для выполнения этого действия",
        )


def check_role(user_role: UserRole, allowed_roles: list[UserRole]) -> None:
    """Проверка что роль пользователя в списке допустимых."""
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


def check_is_active(is_active: bool) -> None:
    """Проверка что аккаунт активен."""
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )