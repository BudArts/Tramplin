# backend/app/routers/__init__.py

# Основные роутеры
from app.routers import auth
from app.routers import users
from app.routers import companies
from app.routers import company_registration
from app.routers import reviews
from app.routers import tags
from app.routers import opportunities
from app.routers import applications
from app.routers import favorites
from app.routers import notifications
from app.routers import contacts
from app.routers import chat
from app.routers import uploads
from app.routers import support
# Не импортируем curator здесь, чтобы избежать циклических импортов
# Он будет загружен динамически в main.py

__all__ = [
    "auth",
    "users",
    "companies",
    "company_registration",
    "reviews",
    "tags",
    "opportunities",
    "applications",
    "favorites",
    "notifications",
    "contacts",
    "chat",
    "uploads",
    "support",
]