# backend/app/schemas/__init__.py

# Auth
from app.schemas.auth import (
    Token,
    TokenPayload,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    MessageResponse,
)

# User
from app.schemas.user import (
    UserRegister,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    EmailVerificationRequest,
    ResendVerificationRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
)

# Company
from app.schemas.company import (
    CompanyRegisterStep1,
    CompanyRegisterStep2,
    CompanyFNSData,
    CompanyResponse,
    CompanyListResponse,
    CompanyUpdate,
    CompanyEmailVerificationRequest,
)

# Common
from app.schemas.common import (
    PaginatedResponse,
    ErrorResponse,
)

__all__ = [
    # Auth
    "Token",
    "TokenPayload",
    "LoginRequest",
    "LoginResponse",
    "RefreshTokenRequest",
    "MessageResponse",
    # User
    "UserRegister",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "EmailVerificationRequest",
    "ResendVerificationRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    # Company
    "CompanyRegisterStep1",
    "CompanyRegisterStep2",
    "CompanyFNSData",
    "CompanyResponse",
    "CompanyListResponse",
    "CompanyUpdate",
    "CompanyEmailVerificationRequest",
    # Common
    "PaginatedResponse",
    "ErrorResponse",
]