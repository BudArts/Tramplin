from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole, PrivacyLevel


# === Ответ: краткая информация о пользователе ===

class UserShort(BaseModel):
    id: int
    display_name: str
    role: UserRole
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    role: UserRole
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# === Профиль соискателя ===

class ApplicantProfileResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    patronymic: str | None = None
    university: str | None = None
    faculty: str | None = None
    course: int | None = None
    graduation_year: int | None = None
    bio: str | None = None
    portfolio_url: str | None = None
    github_url: str | None = None
    resume_url: str | None = None
    privacy_level: PrivacyLevel
    show_applications_to_contacts: bool
    show_resume_to_all: bool
    profile_completeness: int
    skills: list["TagResponse"] = []

    model_config = {"from_attributes": True}


class ApplicantProfileUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    patronymic: str | None = Field(None, max_length=100)
    university: str | None = Field(None, max_length=300)
    faculty: str | None = Field(None, max_length=300)
    course: int | None = Field(None, ge=1, le=6)
    graduation_year: int | None = Field(None, ge=2000, le=2035)
    bio: str | None = Field(None, max_length=2000)
    portfolio_url: str | None = Field(None, max_length=500)
    github_url: str | None = Field(None, max_length=500)
    resume_url: str | None = Field(None, max_length=500)
    skill_ids: list[int] | None = None


class PrivacySettingsUpdate(BaseModel):
    privacy_level: PrivacyLevel | None = None
    show_applications_to_contacts: bool | None = None
    show_resume_to_all: bool | None = None


# === Публичный профиль (с учётом приватности) ===

class ApplicantPublicProfile(BaseModel):
    user_id: int
    display_name: str
    first_name: str
    last_name: str
    university: str | None = None
    faculty: str | None = None
    course: int | None = None
    graduation_year: int | None = None
    bio: str | None = None
    portfolio_url: str | None = None
    github_url: str | None = None
    skills: list["TagResponse"] = []
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


# === Обновление основного профиля ===

class UserUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=2, max_length=150)
    avatar_url: str | None = Field(None, max_length=500)


# Импорт для forward reference
from app.schemas.tag import TagResponse  # noqa: E402

ApplicantProfileResponse.model_rebuild()
ApplicantPublicProfile.model_rebuild()