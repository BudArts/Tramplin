# backend/app/services/__init__.py


from app.services.user_service import user_service, UserService

# Опциональные сервисы
try:
    from app.services.email_service import email_service, EmailService
except ImportError:
    email_service = None
    EmailService = None

try:
    from app.services.fns_service import fns_service, FNSService
except ImportError:
    fns_service = None
    FNSService = None

__all__ = [
    "auth_service",
    "AuthService",
    "user_service",
    "UserService",
    "company_service",
    "CompanyService",
    "email_service",
    "EmailService",
    "fns_service",
    "FNSService",
]