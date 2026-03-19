from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=2, max_length=150)
    role: UserRole = Field(
        description="Роль: applicant или employer"
    )

    # Поля только для работодателя
    company_name: str | None = Field(
        None, min_length=2, max_length=300,
        description="Обязательно для работодателя"
    )
    inn: str | None = Field(
        None, min_length=10, max_length=12,
        description="ИНН компании (10 или 12 цифр)"
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in (UserRole.APPLICANT, UserRole.EMPLOYER):
            raise ValueError("При регистрации доступны роли: applicant, employer")
        return v

    @field_validator("inn")
    @classmethod
    def validate_inn_format(cls, v):
        if v is not None:
            if not v.isdigit():
                raise ValueError("ИНН должен содержать только цифры")
            if len(v) not in (10, 12):
                raise ValueError("ИНН должен содержать 10 или 12 цифр")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: UserRole