# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
import re


class UserRole(str, Enum):
    STUDENT = "student"
    APPLICANT = "student"
    COMPANY = "company"
    EMPLOYER = "company"
    CURATOR = "curator"
    ADMIN = "admin"


class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class PrivacyLevel(str, Enum):
    PUBLIC = "public"
    CONTACTS = "contacts"
    FULL_PUBLIC = "full_public"
    PRIVATE = "private"


# === Регистрация ===

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    password_confirm: str
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    patronymic: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну букву')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        return v
    
    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Пароли не совпадают')
        return v


class UserCreate(BaseModel):
    email: EmailStr
    hashed_password: str
    first_name: str
    last_name: str
    patronymic: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.STUDENT


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    patronymic: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    university: Optional[str] = None
    faculty: Optional[str] = None
    course: Optional[int] = Field(None, ge=1, le=6)
    graduation_year: Optional[int] = None
    bio: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    telegram: Optional[str] = None


# === Ответы ===

class UserShort(BaseModel):
    """Краткая информация о пользователе"""
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    patronymic: Optional[str] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    status: UserStatus
    is_email_verified: bool
    university: Optional[str] = None
    faculty: Optional[str] = None
    course: Optional[int] = None
    graduation_year: Optional[int] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    role: UserRole
    status: UserStatus
    is_email_verified: bool
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# === Профиль соискателя (для совместимости) ===

class ApplicantPublicProfile(BaseModel):
    """Публичный профиль соискателя"""
    id: int
    first_name: str
    last_name: str
    patronymic: Optional[str] = None
    display_name: Optional[str] = None
    university: Optional[str] = None
    faculty: Optional[str] = None
    course: Optional[int] = None
    graduation_year: Optional[int] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: List[str] = []
    
    class Config:
        from_attributes = True


class ApplicantProfile(ApplicantPublicProfile):
    """Полный профиль соискателя (алиас)"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


# === Email верификация ===

class EmailVerificationRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


# === Сброс пароля ===

class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)
    new_password_confirm: str
    
    @validator('new_password_confirm')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Пароли не совпадают')
        return v

ApplicantProfileUpdate = UserUpdate