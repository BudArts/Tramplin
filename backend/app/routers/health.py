from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.config import settings

router = APIRouter(tags=["Система"])


@router.get("/")
async def root():
    return {
        "platform": "Трамплин",
        "description": "Карьерная платформа для студентов и работодателей",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    """Проверка здоровья сервиса + подключения к БД."""
    health_status = {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "unknown",
    }

    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        health_status["database"] = "connected"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["database"] = f"error: {str(e)[:100]}"

    status_code = 200 if health_status["status"] == "ok" else 503
    from fastapi.responses import JSONResponse
    return JSONResponse(content=health_status, status_code=status_code)