from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Действия при запуске и остановке приложения."""
    print("🚀 Трамплин API запускается...")
    yield
    print("🛑 Трамплин API остановлен")


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description="Карьерная платформа для студентов и работодателей",
    lifespan=lifespan,
)

# CORS — разрешаем фронтенду обращаться к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://localhost:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Временный тестовый эндпоинт — убедимся что всё работает
@app.get("/")
async def root():
    return {
        "message": "Трамплин API работает",
        "version": settings.APP_VERSION,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}