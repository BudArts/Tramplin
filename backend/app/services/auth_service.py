# backend/app/services/auth_service.py
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta, timezone
from app.config import settings
from app.models.user import User, UserStatus, UserRole
from app.schemas.user import UserRegister, UserCreate
from app.schemas.auth import Token, TokenPayload
from app.services.email_service import email_service
import logging

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Хэширование пароля"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def generate_token() -> str:
        """Генерация случайного токена для верификации"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_access_token(user: User) -> str:
        """Создание access token"""
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "type": "access",
            "exp": expire
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    @staticmethod
    def create_refresh_token(user: User) -> str:
        """Создание refresh token"""
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": str(user.id),
            "type": "refresh",
            "exp": expire
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    @staticmethod
    def create_tokens(user: User) -> Token:
        """Создание пары токенов"""
        return Token(
            access_token=AuthService.create_access_token(user),
            refresh_token=AuthService.create_refresh_token(user),
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    @staticmethod
    def decode_token(token: str) -> Optional[TokenPayload]:
        """Декодирование токена"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return TokenPayload(
                sub=int(payload["sub"]),
                email=payload.get("email", ""),
                role=payload.get("role", ""),
                exp=datetime.fromtimestamp(payload["exp"]),
                type=payload.get("type", "access")
            )
        except JWTError as e:
            logger.warning(f"Token decode error: {e}")
            return None
    
    async def register_user(
        self,
        db: AsyncSession,
        user_data: UserRegister
    ) -> Tuple[User, bool]:
        """
        Регистрация нового пользователя
        Returns: (user, email_sent)
        """
        # Проверяем, не занят ли email
        existing = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Пользователь с таким email уже существует")
        
        # Создаём пользователя
        verification_token = self.generate_token()
        
        user = User(
            email=user_data.email,
            hashed_password=self.hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            patronymic=user_data.patronymic,
            phone=user_data.phone,
            role=UserRole.STUDENT,
            status=UserStatus.PENDING,
            is_email_verified=False,
            email_verification_token=verification_token,
            email_verification_sent_at=datetime.now(timezone.utc)
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Отправляем email подтверждения
        email_sent = await email_service.send_verification_email(
            email_to=user.email,
            first_name=user.first_name,
            verification_token=verification_token
        )
        
        logger.info(f"User registered: {user.email}, verification email sent: {email_sent}")
        
        return user, email_sent
    
    async def verify_email(self, db: AsyncSession, token: str) -> Optional[User]:
        """Подтверждение email по токену"""
        result = await db.execute(
            select(User).where(User.email_verification_token == token)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        # Проверяем срок действия токена
        if user.email_verification_sent_at:
            # Создаем offset-aware datetime для сравнения
            expires_at = user.email_verification_sent_at + timedelta(
                hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
            )
            # Используем datetime.now(timezone.utc) вместо utcnow()
            if datetime.now(timezone.utc) > expires_at:
                raise ValueError("Срок действия ссылки истёк. Запросите новую.")
        
        # Подтверждаем email
        user.is_email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)  # Исправлено
        user.email_verification_token = None
        user.status = UserStatus.ACTIVE
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Email verified: {user.email}")
        
        return user
    
    async def resend_verification(self, db: AsyncSession, email: str) -> bool:
        """Повторная отправка письма подтверждения"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Не раскрываем, существует ли email
            return True
        
        if user.is_email_verified:
            raise ValueError("Email уже подтверждён")
        
        # Генерируем новый токен
        verification_token = self.generate_token()
        user.email_verification_token = verification_token
        user.email_verification_sent_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # Отправляем email
        return await email_service.send_verification_email(
            email_to=user.email,
            first_name=user.first_name,
            verification_token=verification_token
        )
    
    async def authenticate(
        self,
        db: AsyncSession,
        email: str,
        password: str
    ) -> Optional[User]:
        """Аутентификация пользователя"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        return user
    
    async def login(
        self,
        db: AsyncSession,
        email: str,
        password: str
    ) -> Tuple[User, Token]:
        """Вход пользователя"""
        user = await self.authenticate(db, email, password)
        
        if not user:
            raise ValueError("Неверный email или пароль")
        
        if not user.is_email_verified:
            raise ValueError("Email не подтверждён. Проверьте почту или запросите новое письмо.")
        
        if user.status == UserStatus.SUSPENDED:
            raise ValueError("Аккаунт заблокирован. Свяжитесь с поддержкой.")
        
        if user.status == UserStatus.DELETED:
            raise ValueError("Аккаунт удалён")
        
        # Обновляем время последнего входа
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        
        tokens = self.create_tokens(user)
        
        return user, tokens
    
    async def refresh_tokens(self, db: AsyncSession, refresh_token: str) -> Token:
        """Обновление токенов"""
        payload = self.decode_token(refresh_token)
        
        if not payload or payload.type != "refresh":
            raise ValueError("Невалидный refresh token")
        
        result = await db.execute(
            select(User).where(User.id == payload.sub)
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise ValueError("Пользователь не найден или неактивен")
        
        return self.create_tokens(user)
    
    async def request_password_reset(self, db: AsyncSession, email: str) -> bool:
        """Запрос на сброс пароля"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Не раскрываем информацию
            return True
        
        reset_token = self.generate_token()
        user.password_reset_token = reset_token
        user.password_reset_sent_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        return await email_service.send_password_reset_email(
            email_to=user.email,
            first_name=user.first_name,
            reset_token=reset_token
        )
    
    async def reset_password(
        self,
        db: AsyncSession,
        token: str,
        new_password: str
    ) -> bool:
        """Сброс пароля по токену"""
        result = await db.execute(
            select(User).where(User.password_reset_token == token)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Невалидный токен")
        
        # Проверяем срок действия (1 час)
        if user.password_reset_sent_at:
            expires_at = user.password_reset_sent_at + timedelta(hours=1)
            if datetime.now(timezone.utc) > expires_at:
                raise ValueError("Срок действия ссылки истёк")
        
        user.hashed_password = self.hash_password(new_password)
        user.password_reset_token = None
        user.password_reset_sent_at = None
        
        await db.commit()
        
        return True
    
    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> Optional[User]:
        """Получение пользователя по ID"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()


# Singleton
auth_service = AuthService()