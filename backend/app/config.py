from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://tramplin_user:strongpassword123@localhost:5432/tramplin"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis (пока опционально)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Admin по умолчанию
    ADMIN_EMAIL: str = "admin@tramplin.ru"
    ADMIN_PASSWORD: str = "admin123"

    # Приложение
    APP_TITLE: str = "Трамплин API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()