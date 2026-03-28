# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
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
    redirect_slashes=False
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


# === Роутеры ===
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.company_registration import router as company_registration_router
from app.routers.companies import router as companies_router
from app.routers.reviews import router as reviews_router
from app.routers.tags import router as tags_router
from app.routers.opportunities import router as opportunities_router
from app.routers.applications import router as applications_router
from app.routers.favorites import router as favorites_router
from app.routers.notifications import router as notifications_router
from app.routers.contacts import router as contacts_router
from app.routers.chat import router as chat_router
from app.routers.uploads import router as uploads_router
from app.routers.support import router as support_router
from app.routers.curator import router as curator_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(company_registration_router)
app.include_router(companies_router)
app.include_router(reviews_router)
app.include_router(tags_router)
app.include_router(opportunities_router)
app.include_router(applications_router)
app.include_router(favorites_router)
app.include_router(notifications_router)
app.include_router(contacts_router)
app.include_router(chat_router)
app.include_router(uploads_router)
app.include_router(support_router)
app.include_router(curator_router)

print("\n✅ Все роутеры загружены")

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

@app.get("/debug/routes", tags=["Debug"])
async def list_routes():
    """Список всех загруженных маршрутов (для отладки)"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if hasattr(route, 'methods') else [],
            })
    return {"total_routes": len(routes), "routes": routes}