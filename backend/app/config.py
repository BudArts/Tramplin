# backend/app/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    # ============ Database ============
    DATABASE_URL: str
    
    # ============ Security ============
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ============ Email ============
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    # ============ Frontend ============
    FRONTEND_URL: str = "http://localhost:5173"
    DOMAIN_NAME: str = "localhost:8000"  # default для dev
    
    
    
    # ============ FNS API ============
    FNS_API_URL: str = "https://api-fns.ru/api"
    FNS_API_KEY: Optional[str] = None
    
    # ============ Redis ============
    REDIS_URL: str = "redis://redis:6379/0"
    
    # ============ App ============
    APP_NAME: str = "Tramplin"
    APP_TITLE: str = "Tramplin API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    
    # ============ Admin ============
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    
    # ============ CORS ============
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # ============ Rate Limiting ============
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # ============ Uploads ============
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,gif,pdf,doc,docx"
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")]
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()