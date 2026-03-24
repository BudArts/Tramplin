# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import auth_service
from app.schemas.user import (
    UserRegister,
    UserResponse,
    EmailVerificationRequest,
    ResendVerificationRequest,
    PasswordResetRequest,
    PasswordResetConfirm
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    Token,
    MessageResponse
)
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация пользователя",
    description="Регистрация нового пользователя с отправкой письма для подтверждения email"
)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация нового пользователя (студента).
    
    После регистрации на указанный email будет отправлено письмо
    со ссылкой для подтверждения.
    
    Требуемые поля:
    - **email**: действующий email адрес
    - **password**: минимум 8 символов, должен содержать буквы и цифры
    - **password_confirm**: подтверждение пароля
    - **first_name**: имя (2-100 символов)
    - **last_name**: фамилия (2-100 символов)
    - **patronymic**: отчество (опционально)
    - **phone**: телефон (опционально)
    """
    try:
        user, email_sent = await auth_service.register_user(db, user_data)
        
        if email_sent:
            return MessageResponse(
                message="Регистрация успешна! Проверьте почту для подтверждения email.",
                success=True
            )
        else:
            return MessageResponse(
                message="Регистрация успешна, но не удалось отправить письмо. "
                        "Запросите повторную отправку.",
                success=True
            )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Подтверждение email"
)
async def verify_email(
    data: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждение email по токену из письма.
    
    После подтверждения аккаунт становится активным.
    """
    try:
        user = await auth_service.verify_email(db, data.token)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Невалидный или просроченный токен"
            )
        
        return MessageResponse(
            message="Email успешно подтверждён! Теперь вы можете войти.",
            success=True
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Повторная отправка письма подтверждения"
)
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Повторная отправка письма для подтверждения email.
    
    Используйте, если письмо не пришло или ссылка истекла.
    """
    try:
        await auth_service.resend_verification(db, data.email)
        
        # Всегда возвращаем успех, чтобы не раскрывать существование email
        return MessageResponse(
            message="Если указанный email зарегистрирован, письмо будет отправлено.",
            success=True
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Вход в систему"
)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Аутентификация пользователя.
    
    Возвращает access_token и refresh_token.
    
    Требования:
    - Email должен быть подтверждён
    - Аккаунт не должен быть заблокирован
    """
    try:
        user, tokens = await auth_service.login(db, credentials.email, credentials.password)
        
        return LoginResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
            user=UserResponse.model_validate(user)
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.post(
    "/refresh",
    response_model=Token,
    summary="Обновление токенов"
)
async def refresh_tokens(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление access_token с помощью refresh_token.
    
    Используйте, когда access_token истёк.
    """
    try:
        tokens = await auth_service.refresh_tokens(db, data.refresh_token)
        return tokens
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.post(
    "/password-reset/request",
    response_model=MessageResponse,
    summary="Запрос сброса пароля"
)
async def request_password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Запрос на сброс пароля.
    
    На указанный email будет отправлено письмо со ссылкой для сброса.
    """
    await auth_service.request_password_reset(db, data.email)
    
    # Всегда возвращаем успех
    return MessageResponse(
        message="Если указанный email зарегистрирован, письмо будет отправлено.",
        success=True
    )


@router.post(
    "/password-reset/confirm",
    response_model=MessageResponse,
    summary="Подтверждение сброса пароля"
)
async def confirm_password_reset(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """
    Установка нового пароля по токену из письма.
    """
    try:
        await auth_service.reset_password(db, data.token, data.new_password)
        
        return MessageResponse(
            message="Пароль успешно изменён! Теперь вы можете войти.",
            success=True
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Текущий пользователь"
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получение информации о текущем авторизованном пользователе.
    """
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Выход из системы"
)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Выход из системы.
    
    Примечание: При использовании JWT токенов, выход на клиенте 
    осуществляется удалением токенов. Для полноценного выхода 
    можно добавить токен в чёрный список (требует Redis).
    """
    # TODO: Добавить токен в чёрный список при наличии Redis
    return MessageResponse(
        message="Выход выполнен успешно",
        success=True
    )
    
    
@router.get("/debug-smtp")
async def debug_smtp():
    """Временный тест SMTP — УДАЛИТЬ после отладки!"""
    import aiosmtplib
    from app.config import settings
    
    result = {
        "server": settings.MAIL_SERVER,
        "port": settings.MAIL_PORT,
        "username": settings.MAIL_USERNAME,
        "from": settings.MAIL_FROM,
        "starttls": settings.MAIL_STARTTLS,
        "ssl_tls": settings.MAIL_SSL_TLS,
        "password_length": len(settings.MAIL_PASSWORD),
        "password_first3": settings.MAIL_PASSWORD[:3] + "***",
        "password_last3": "***" + settings.MAIL_PASSWORD[-3:],
        # Проверяем нет ли мусора в пароле
        "password_has_spaces": " " in settings.MAIL_PASSWORD,
        "password_has_hash": "#" in settings.MAIL_PASSWORD,
        "password_has_quotes": '"' in settings.MAIL_PASSWORD or "'" in settings.MAIL_PASSWORD,
    }
    
    # Пробуем подключиться напрямую
    try:
        smtp = aiosmtplib.SMTP(
            hostname=settings.MAIL_SERVER,
            port=settings.MAIL_PORT,
            use_tls=settings.MAIL_SSL_TLS,
            start_tls=settings.MAIL_STARTTLS,
        )
        await smtp.connect()
        result["connect"] = "✅ OK"
        
        try:
            await smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            result["login"] = "✅ OK"
        except Exception as e:
            result["login"] = f"❌ {e}"
        
        await smtp.quit()
    except Exception as e:
        result["connect"] = f"❌ {e}"
    
    return result