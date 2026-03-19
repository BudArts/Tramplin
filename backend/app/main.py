from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.companies import router as companies_router
from app.routers.opportunities import router as opportunities_router
from app.routers.tags import router as tags_router
from app.routers.applications import router as applications_router
from app.routers.favorites import router as favorites_router
from app.routers.notifications import router as notifications_router
from app.routers.contacts import router as contacts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Трамплин API запускается...")
    yield
    print("🛑 Трамплин API остановлен")


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description="Карьерная платформа для студентов и работодателей",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(companies_router)
app.include_router(opportunities_router)
app.include_router(tags_router)
app.include_router(applications_router)
app.include_router(favorites_router)
app.include_router(notifications_router)
app.include_router(contacts_router)


@app.get("/", tags=["Система"])
async def root():
    return {
        "message": "Трамплин API работает",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Система"])
async def health():
    return {"status": "ok"}