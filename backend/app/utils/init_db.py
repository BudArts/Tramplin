"""
Инициализация базы данных (создание таблиц)
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.database import Base

# Импортируем все модели чтобы они зарегистрировались в Base.metadata
from app.models.user import User
from app.models.company import Company
from app.models.opportunity import Opportunity
from app.models.application import Application
from app.models.tag import Tag
from app.models.favorite import Favorite
from app.models.notification import Notification
from app.models.chat import ChatMessage
from app.models.contact import Contact
from app.models.support import SupportTicket
from app.models.recommendation import Recommendation
from app.models.review import Review, ReviewHelpful


async def init_db():
    """Создать все таблицы"""
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        print("🗄️  Удаляем старые таблицы (если есть)...")
        await conn.run_sync(Base.metadata.drop_all)
        
        print("🗄️  Создаём таблицы...")
        await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Таблицы успешно созданы!")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_db())