# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from app.routers import reviews
import os
import sys

from app.config import settings

# Middleware
try:
    from app.middleware.error_handler import (
        http_exception_handler,
        validation_exception_handler,
        general_exception_handler,
    )
    HAS_ERROR_HANDLERS = True
except ImportError:
    HAS_ERROR_HANDLERS = False

try:
    from app.middleware.request_logger import RequestLoggerMiddleware
    HAS_REQUEST_LOGGER = True
except ImportError:
    HAS_REQUEST_LOGGER = False

try:
    from app.middleware.security import SecurityHeadersMiddleware
    HAS_SECURITY = True
except ImportError:
    HAS_SECURITY = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("")
    print("=" * 60)
    print(f"  🚀 {settings.APP_NAME} API — Запуск")
    print(f"  📖 Документация: http://localhost:8000/docs")
    print(f"  🔧 Окружение: {settings.ENVIRONMENT}")
    print("=" * 60)
    print("")
    yield
    print("🛑 API остановлен")


# === Создание приложения ===
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## Трамплин API

Платформа для стажировок и карьеры студентов.

### Возможности:
- Регистрация студентов и компаний
- Подтверждение email
- Проверка компаний через ФНС API
- Публикация вакансий и стажировок
- Отклики на вакансии
- Чат между соискателями и компаниями
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# === Middleware ===

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if HAS_SECURITY:
    app.add_middleware(SecurityHeadersMiddleware)

if HAS_REQUEST_LOGGER:
    app.add_middleware(RequestLoggerMiddleware)

# === Exception handlers ===
if HAS_ERROR_HANDLERS:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)


# === Функция безопасной загрузки роутера ===
def load_router(module_path: str, router_attr: str = "router"):
    """Загружает роутер, возвращает None если ошибка"""
    try:
        module = __import__(module_path, fromlist=[router_attr])
        router = getattr(module, router_attr)
        return router
    except Exception as e:
        print(f"⚠️  Роутер {module_path}: {e}")
        return None


# === Роутеры ===

# Основные (обязательные)
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.companies import router as companies_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(companies_router)
app.include_router(reviews.router)

# Опциональные роутеры
routers_to_load = [
    "app.routers.tags",
    "app.routers.opportunities",
    "app.routers.applications",
    "app.routers.favorites",
    "app.routers.notifications",
    "app.routers.contacts",
    "app.routers.chat",
    "app.routers.uploads",
    "app.routers.support",
    "app.routers.curator",
]

for module_path in routers_to_load:
    router = load_router(module_path)
    if router:
        app.include_router(router)
        print(f"✅ Загружен: {module_path}")


# === Static files ===
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# === Health & Root ===

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }
# backend/app/main.py
# Добавьте после создания app

@app.get("/debug/cors", tags=["Debug"])
async def debug_cors():
    return {
        "cors_origins": settings.CORS_ORIGINS,
        "cors_origins_list": settings.cors_origins_list,
        "frontend_url": settings.FRONTEND_URL,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}