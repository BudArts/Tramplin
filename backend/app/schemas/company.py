# backend/app/schemas/company.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import re


class CompanyStatus(str, Enum):
    PENDING_EMAIL = "pending_email"      # Ожидает подтверждения email
    PENDING_REVIEW = "pending_review"    # На модерации
    ACTIVE = "active"                    # Активна
    SUSPENDED = "suspended"              # Приостановлена
    REJECTED = "rejected"                # Отклонена


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class CompanySize(str, Enum):
    MICRO = "micro"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class TrustLevel(str, Enum):
    NEW = "new"
    TRUSTED = "trusted"
    VERIFIED = "verified"


# === Регистрация компании (упрощённая) ===

class CompanyRegisterRequest(BaseModel):
    """Регистрация компании - упрощённая форма"""
    # Данные компании
    inn: str = Field(..., min_length=10, max_length=12, description="ИНН компании")
    company_name: str = Field(..., min_length=2, max_length=200, description="Название компании")
    email: EmailStr = Field(..., description="Корпоративная почта компании")
    phone: Optional[str] = Field(None, max_length=20, description="Телефон компании")
    
    # Данные администратора (контактного лица)
    user_first_name: str = Field(..., min_length=2, max_length=100)
    user_last_name: str = Field(..., min_length=2, max_length=100)
    user_patronymic: Optional[str] = Field(None, max_length=100)
    user_email: EmailStr = Field(..., description="Email контактного лица")
    user_password: str = Field(..., min_length=6, max_length=100)
    user_password_confirm: str
    
    @field_validator('inn')
    @classmethod
    def validate_inn(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError('ИНН должен содержать только цифры')
        if len(v) not in [10, 12]:
            raise ValueError('ИНН должен содержать 10 или 12 цифр')
        return v
    
    @field_validator('email')
    @classmethod
    def validate_corporate_email(cls, v: str) -> str:
        """Проверка на корпоративную почту"""
        free_domains = [
            'gmail.com', 'mail.ru', 'yandex.ru', 'yahoo.com', 
            'hotmail.com', 'outlook.com', 'rambler.ru', 'bk.ru',
            'list.ru', 'inbox.ru', 'gmx.com', 'icloud.com', 
            'me.com', 'live.com', 'mail.com', 'protonmail.com'
        ]
        domain = v.split('@')[1].lower()
        if domain in free_domains:
            raise ValueError('Требуется корпоративная почта (например, @company.ru)')
        return v
    
    @field_validator('user_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        if not re.search(r'[A-Za-zА-Яа-я]', v):
            raise ValueError('Пароль должен содержать хотя бы одну букву')
        return v
    
    @field_validator('user_password_confirm')
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if 'user_password' in info.data and v != info.data['user_password']:
            raise ValueError('Пароли не совпадают')
        return v


# === Старые схемы (для совместимости) ===

class CompanyRegisterStep1(BaseModel):
    """Шаг 1: Ввод ИНН (deprecated)"""
    inn: str = Field(..., min_length=10, max_length=12, description="ИНН компании")
    
    @field_validator('inn')
    @classmethod
    def validate_inn(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError('ИНН должен содержать только цифры')
        if len(v) not in [10, 12]:
            raise ValueError('ИНН должен содержать 10 или 12 цифр')
        return v


class CompanyFNSData(BaseModel):
    """Данные компании (упрощённые, без ФНС)"""
    inn: str
    ogrn: Optional[str] = None
    kpp: Optional[str] = None
    full_name: Optional[str] = None
    short_name: Optional[str] = None
    legal_address: Optional[str] = None
    director_name: Optional[str] = None
    director_position: Optional[str] = None
    status: str = "active"
    registration_date: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


# Алиас для обратной совместимости
CompanyRegisterStep2 = CompanyRegisterRequest


class CompanyCreate(BaseModel):
    inn: str
    ogrn: Optional[str] = None
    kpp: Optional[str] = None
    full_name: str
    short_name: Optional[str] = None
    legal_address: Optional[str] = None
    director_name: Optional[str] = None
    director_position: Optional[str] = None
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    fns_data: Optional[Dict[str, Any]] = None


class CompanyUpdate(BaseModel):
    brand_name: Optional[str] = Field(None, max_length=255)
    actual_address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = Field(None, max_length=255)
    size: Optional[CompanySize] = None
    founded_year: Optional[int] = Field(None, ge=1800, le=2030)


# === Ответы ===

class CompanyShort(BaseModel):
    """Краткая информация о компании"""
    id: int
    inn: str
    name: Optional[str] = None
    short_name: Optional[str] = None
    brand_name: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    
    @property
    def display_name(self) -> str:
        return self.brand_name or self.short_name or self.name or "Компания"

    class Config:
        from_attributes = True


class CompanyResponse(BaseModel):
    id: int
    inn: str
    ogrn: Optional[str] = None
    name: Optional[str] = None
    full_name: str
    short_name: Optional[str] = None
    brand_name: Optional[str] = None
    display_name: Optional[str] = None
    legal_address: Optional[str] = None
    actual_address: Optional[str] = None
    city: Optional[str] = None
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    status: CompanyStatus
    verification_status: Optional[VerificationStatus] = None
    is_email_verified: bool
    description: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[CompanySize] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    employee_count: Optional[int] = None
    founded_year: Optional[int] = None
    trust_level: Optional[TrustLevel] = None
    social_links: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    rating: float = Field(default=0.0, description="Средний рейтинг компании")
    reviews_count: int = Field(default=0, description="Количество отзывов")
    
    class Config:
        from_attributes = True


class CompanyListResponse(BaseModel):
    id: int
    inn: str
    name: Optional[str] = None
    short_name: Optional[str] = None
    brand_name: Optional[str] = None
    display_name: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    status: CompanyStatus
    logo_url: Optional[str] = None
    rating: float = Field(default=0.0, description="Средний рейтинг компании")
    reviews_count: int = Field(default=0, description="Количество отзывов")
    
    class Config:
        from_attributes = True


# === Email верификация ===

class CompanyEmailVerificationRequest(BaseModel):
    token: str


class CompanyRegisterResponse(BaseModel):
    """Ответ на регистрацию компании"""
    message: str
    company_id: int
    email: str


CompanyDetailResponse = CompanyResponse