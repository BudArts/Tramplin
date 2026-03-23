# backend/app/schemas/company.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import re


class CompanyStatus(str, Enum):
    PENDING_EMAIL = "pending_email"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


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


# === Регистрация компании ===

class CompanyRegisterStep1(BaseModel):
    """Шаг 1: Ввод ИНН"""
    inn: str = Field(..., min_length=10, max_length=12)
    
    @validator('inn')
    def validate_inn(cls, v):
        v = v.strip()
        if not v.isdigit():
            raise ValueError('ИНН должен содержать только цифры')
        if len(v) not in [10, 12]:
            raise ValueError('ИНН должен содержать 10 или 12 цифр')
        return v


class CompanyFNSData(BaseModel):
    """Данные компании из ФНС API"""
    inn: str
    ogrn: Optional[str] = None
    kpp: Optional[str] = None
    full_name: str
    short_name: Optional[str] = None
    legal_address: Optional[str] = None
    director_name: Optional[str] = None
    director_position: Optional[str] = None
    status: str
    registration_date: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class CompanyRegisterStep2(BaseModel):
    """Шаг 2: Подтверждение и ввод email"""
    inn: str
    email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None
    
    user_first_name: str = Field(..., min_length=2, max_length=100)
    user_last_name: str = Field(..., min_length=2, max_length=100)
    user_patronymic: Optional[str] = Field(None, max_length=100)
    user_email: EmailStr
    user_password: str = Field(..., min_length=8, max_length=100)
    user_password_confirm: str
    
    @validator('email')
    def validate_corporate_email(cls, v):
        free_domains = [
            'gmail.com', 'mail.ru', 'yandex.ru', 'yahoo.com', 
            'hotmail.com', 'outlook.com', 'rambler.ru', 'bk.ru',
            'list.ru', 'inbox.ru'
        ]
        domain = v.split('@')[1].lower()
        if domain in free_domains:
            raise ValueError('Требуется корпоративная почта')
        return v
    
    @validator('user_password_confirm')
    def passwords_match(cls, v, values):
        if 'user_password' in values and v != values['user_password']:
            raise ValueError('Пароли не совпадают')
        return v


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
    
    class Config:
        from_attributes = True


# === Email верификация ===

class CompanyEmailVerificationRequest(BaseModel):
    token: str
    
CompanyDetailResponse = CompanyResponse