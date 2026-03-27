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


# === Функция безопасной загрузки роутера ===
def load_router(module_path: str, router_attr: str = "router"):
    """Загружает роутер, возвращает None если ошибка"""
    try:
        print(f"  🔍 Пытаюсь загрузить: {module_path}")
        module = __import__(module_path, fromlist=[router_attr])
        router = getattr(module, router_attr)
        print(f"  ✅ Успешно загружен: {module_path}")
        return router
    except Exception as e:
        print(f"  ❌ Ошибка загрузки {module_path}: {e}")
        import traceback
        traceback.print_exc()
        return None


# === Роутеры ===

# Основные (обязательные)
print("\n📡 Загрузка основных роутеров:")
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.company_registration import router as company_registration_router
from app.routers.companies import router as companies_router

app.include_router(auth_router)
print("  ✅ auth_router загружен")
app.include_router(users_router)
print("  ✅ users_router загружен")
app.include_router(company_registration_router)
print("  ✅ company_registration_router загружен")
app.include_router(companies_router)
print("  ✅ companies_router загружен")
app.include_router(reviews.router)
print("  ✅ reviews_router загружен")

# Опциональные роутеры
print("\n📡 Загрузка опциональных роутеров:")
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
    "app.routers.curator",  # Кураторский роутер
]

for module_path in routers_to_load:
    router = load_router(module_path)
    if router:
        app.include_router(router)
        print(f"  ✅ Включен в приложение: {module_path}")
    else:
        print(f"  ⚠️ Пропущен: {module_path}")

# Принудительная загрузка curator роутера, если он не загрузился
print("\n📡 Проверка принудительной загрузки curator:")
try:
    from app.routers.curator import router as curator_router
    # Проверяем, не загружен ли уже
    already_loaded = False
    for route in app.routes:
        if hasattr(route, 'path') and route.path.startswith('/api/curator'):
            already_loaded = True
            break
    
    if not already_loaded:
        app.include_router(curator_router)
        print("  ✅ Принудительно загружен: app.routers.curator")
    else:
        print("  ℹ️ Curator роутер уже загружен")
except Exception as e:
    print(f"  ❌ Ошибка принудительной загрузки curator: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("✅ Все роутеры загружены")
print("=" * 60)

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

# Добавим эндпоинт для проверки загруженных роутеров
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