from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from app.routers.uploads import router as uploads_router
from app.routers.chat import router as chat_router
from app.routers.support import router as support_router
from app.config import settings
from app.utils.logger import logger

# Middleware
from app.middleware.request_logger import RequestLoggerMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    database_error_handler,
    general_exception_handler,
)

# Routers
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.companies import router as companies_router
from app.routers.tags import router as tags_router
from app.routers.opportunities import router as opportunities_router
from app.routers.applications import router as applications_router
from app.routers.favorites import router as favorites_router
from app.routers.notifications import router as notifications_router
from app.routers.contacts import router as contacts_router
from app.routers.curator import router as curator_router
from app.routers.haelth import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Трамплин API запускается [{settings.ENVIRONMENT}]")
    logger.info(f"📖 Документация: http://localhost:8000/docs")
    logger.info(f"🔧 Debug: {settings.DEBUG}")

    if settings.SECRET_KEY == "CHANGE-THIS-IN-PRODUCTION-TO-RANDOM-64-CHARS":
        logger.warning("⚠️  SECRET_KEY не изменён! Установите безопасный ключ!")

    yield

    logger.info("🛑 Трамплин API остановлен")


# === Создание приложения ===

app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description="""
## Трамплин API

Карьерная платформа для студентов, выпускников и работодателей.

### Роли:
- **Соискатель** — поиск вакансий, отклики, нетворкинг
- **Работодатель** — публикация вакансий, управление откликами
- **Куратор** — модерация контента, верификация компаний
- **Администратор** — полный доступ + создание кураторов
    """,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# === Middleware (порядок важен — снизу вверх) ===

# 1. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 2. Request logging
app.add_middleware(RequestLoggerMiddleware)

# 3. Rate limiting
app.add_middleware(
    RateLimiterMiddleware,
    max_requests=settings.RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
)

# 4. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

# === Exception handlers ===

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, database_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# === Routers ===

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(companies_router)
app.include_router(tags_router)
app.include_router(opportunities_router)
app.include_router(applications_router)
app.include_router(favorites_router)
app.include_router(notifications_router)
app.include_router(contacts_router)
app.include_router(curator_router)
app.include_router(uploads_router)
app.include_router(chat_router)
app.include_router(support_router)
from fastapi.staticfiles import StaticFiles
import os

# Раздача загруженных файлов
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")