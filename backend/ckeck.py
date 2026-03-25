# scripts/check_companies.py

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.company import Company, CompanyStatus
from app.config import settings

async def check_companies():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Получаем все компании
        query = select(Company)
        result = await db.execute(query)
        companies = result.scalars().all()
        
        print(f"Всего компаний: {len(companies)}")
        
        for company in companies:
            print(f"\nID: {company.id}")
            print(f"Название: {company.full_name}")
            print(f"Статус: {company.status}")
            print(f"Email подтвержден: {company.is_email_verified}")
            print(f"Рейтинг: {company.rating}")
            print(f"Кол-во отзывов: {company.reviews_count}")
            
            # Если компания не активна, обновим её статус для теста
            if company.status != CompanyStatus.ACTIVE:
                print(f"  -> Компания не активна. Обновляем статус...")
                company.status = CompanyStatus.ACTIVE
                company.is_email_verified = True
        
        await db.commit()
        print("\nСтатусы компаний обновлены")

if __name__ == "__main__":
    asyncio.run(check_companies())