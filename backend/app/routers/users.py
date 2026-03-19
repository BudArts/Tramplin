from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole, ApplicantProfile
from app.schemas.user import (
    UserResponse,
    ApplicantProfileResponse,
    ApplicantProfileUpdate,
    ApplicantPublicProfile,
    PrivacySettingsUpdate,
    UserUpdate,
)
from app.schemas.common import MessageResponse
from app.utils.validators import calculate_profile_completeness

router = APIRouter(prefix="/api/users", tags=["Пользователи"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Текущий пользователь",
)
async def get_current_user_info(
    user: User = Depends(get_current_user),
):
    """Возвращает информацию о текущем авторизованном пользователе."""
    return user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Обновить профиль",
)
async def update_current_user(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновление display_name и avatar_url."""
    if data.display_name is not None:
        user.display_name = data.display_name.strip()
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    await db.commit()
    await db.refresh(user)
    return user


# === Профиль соискателя ===

@router.get(
    "/me/applicant-profile",
    response_model=ApplicantProfileResponse,
    summary="Профиль соискателя",
)
async def get_my_applicant_profile(
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает полный профиль соискателя с навыками."""
    result = await db.execute(
        select(ApplicantProfile)
        .options(selectinload(ApplicantProfile.skills))
        .where(ApplicantProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль соискателя не найден",
        )

    return profile


@router.put(
    "/me/applicant-profile",
    response_model=ApplicantProfileResponse,
    summary="Обновить профиль соискателя",
)
async def update_my_applicant_profile(
    data: ApplicantProfileUpdate,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Обновление резюме, навыков, личной информации соискателя."""
    result = await db.execute(
        select(ApplicantProfile)
        .options(selectinload(ApplicantProfile.skills))
        .where(ApplicantProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль соискателя не найден",
        )

    # Обновляем поля (только те, что переданы)
    update_fields = data.model_dump(exclude_unset=True, exclude={"skill_ids"})
    for field, value in update_fields.items():
        setattr(profile, field, value)

    # Обновляем навыки если переданы
    if data.skill_ids is not None:
        from app.models.tag import Tag
        result = await db.execute(
            select(Tag).where(
                Tag.id.in_(data.skill_ids),
                Tag.is_approved == True,
            )
        )
        tags = result.scalars().all()
        profile.skills = list(tags)

    # Пересчитываем заполненность профиля
    profile.profile_completeness = calculate_profile_completeness(profile)

    await db.commit()
    await db.refresh(profile)

    # Перезагружаем с навыками
    result = await db.execute(
        select(ApplicantProfile)
        .options(selectinload(ApplicantProfile.skills))
        .where(ApplicantProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    return profile


@router.put(
    "/me/privacy",
    response_model=MessageResponse,
    summary="Настройки приватности",
)
async def update_privacy_settings(
    data: PrivacySettingsUpdate,
    user: User = Depends(require_role(UserRole.APPLICANT)),
    db: AsyncSession = Depends(get_db),
):
    """Обновление настроек приватности профиля соискателя."""
    result = await db.execute(
        select(ApplicantProfile)
        .where(ApplicantProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль не найден",
        )

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(profile, field, value)

    await db.commit()
    return MessageResponse(message="Настройки приватности обновлены")


# === Публичный профиль ===

@router.get(
    "/{user_id}",
    response_model=ApplicantPublicProfile | UserResponse,
    summary="Публичный профиль пользователя",
)
async def get_user_profile(
    user_id: int,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение публичного профиля пользователя.
    Учитывает настройки приватности соискателя.
    """
    # Находим пользователя
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    # Если это соискатель — проверяем приватность
    if target_user.role == UserRole.APPLICANT:
        result = await db.execute(
            select(ApplicantProfile)
            .options(selectinload(ApplicantProfile.skills))
            .where(ApplicantProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль не найден",
            )

        # Проверка приватности
        from app.models.user import PrivacyLevel
        privacy = profile.privacy_level

        # Свой профиль — всегда видно
        if current_user and current_user.id == user_id:
            return profile

        # FULL_PUBLIC — видно всем
        if privacy == PrivacyLevel.FULL_PUBLIC:
            return ApplicantPublicProfile(
                user_id=target_user.id,
                display_name=target_user.display_name,
                first_name=profile.first_name,
                last_name=profile.last_name,
                university=profile.university,
                faculty=profile.faculty,
                course=profile.course,
                graduation_year=profile.graduation_year,
                bio=profile.bio,
                portfolio_url=profile.portfolio_url,
                github_url=profile.github_url,
                skills=[],
                avatar_url=target_user.avatar_url,
            )

        # PUBLIC — видно авторизованным
        if privacy == PrivacyLevel.PUBLIC:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Профиль доступен только авторизованным пользователям",
                )
            return ApplicantPublicProfile(
                user_id=target_user.id,
                display_name=target_user.display_name,
                first_name=profile.first_name,
                last_name=profile.last_name,
                university=profile.university,
                faculty=profile.faculty,
                course=profile.course,
                graduation_year=profile.graduation_year,
                bio=profile.bio,
                portfolio_url=profile.portfolio_url,
                github_url=profile.github_url,
                skills=[],
                avatar_url=target_user.avatar_url,
            )

        # CONTACTS — видно только контактам
        if privacy == PrivacyLevel.CONTACTS:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Профиль доступен только контактам",
                )
            # Проверяем, является ли текущий пользователь контактом
            # или куратором/работодателем
            if current_user.role in (UserRole.CURATOR, UserRole.ADMIN):
                pass  # кураторы видят всех
            elif current_user.role == UserRole.EMPLOYER:
                pass  # работодатели видят соискателей
            else:
                from app.models.contact import Contact, ContactStatus
                contact_check = await db.execute(
                    select(Contact).where(
                        Contact.status == ContactStatus.ACCEPTED,
                        (
                            (Contact.user_id == current_user.id) & (Contact.contact_id == user_id)
                        ) | (
                            (Contact.user_id == user_id) & (Contact.contact_id == current_user.id)
                        )
                    )
                )
                if not contact_check.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Профиль доступен только контактам",
                    )

            return ApplicantPublicProfile(
                user_id=target_user.id,
                display_name=target_user.display_name,
                first_name=profile.first_name,
                last_name=profile.last_name,
                university=profile.university,
                faculty=profile.faculty,
                course=profile.course,
                graduation_year=profile.graduation_year,
                bio=profile.bio,
                portfolio_url=profile.portfolio_url,
                github_url=profile.github_url,
                skills=[],
                avatar_url=target_user.avatar_url,
            )

        # PRIVATE
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Профиль скрыт",
        )

    # Для остальных ролей — базовая информация
    return target_user