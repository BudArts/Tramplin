# backend/app/routers/__init__.py

# Основные роутеры
from app.routers import auth
from app.routers import users
from app.routers import companies

__all__ = [
    "auth",
    "users",
    "companies",
]