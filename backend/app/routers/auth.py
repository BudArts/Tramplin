from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole, ApplicantProfile
from app.models.company import Company, VerificationStatus
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.utils.validators import validate_inn

router = APIRouter(prefix="/api/auth", tags=["Авторизация"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя",
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Регистрация соискателя или работодателя.

    - **applicant**: создаётся пользователь + пустой профиль соискателя
    - **employer**: создаётся пользователь + компания (статус: pending)
    """
    existing = await db.execute(
        select(User).where(User.email == data.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    if data.role == UserRole.EMPLOYER:
        if not data.company_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для работодателя необходимо указать название компании",
            )
        if data.inn and not validate_inn(data.inn):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Невалидный ИНН",
            )

    user = User(
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        display_name=data.display_name.strip(),
        role=data.role,
    )
    db.add(user)
    await db.flush()

    if data.role == UserRole.APPLICANT:
        profile = ApplicantProfile(
            user_id=user.id,
            first_name=data.display_name.strip(),
            last_name="",
        )
        db.add(profile)

    elif data.role == UserRole.EMPLOYER:
        company = Company(
            owner_id=user.id,
            name=data.company_name.strip(),
            inn=data.inn,
            verification_status=VerificationStatus.PENDING,
        )
        db.add(company)

    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id), "role": user.role.value}

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Вход в систему",
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Авторизация по email и паролю."""
    result = await db.execute(
        select(User).where(User.email == data.email.lower().strip())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )

    token_data = {"sub": str(user.id), "role": user.role.value}

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Обновление access токена",
)
async def refresh_token(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновление access токена по refresh токену."""
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(
        select(User).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )

    token_data = {"sub": str(user.id), "role": user.role.value}

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
    )