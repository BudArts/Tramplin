# scripts/add_reviews_and_rating.py

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.company import Company, CompanyStatus
from app.models.review import Review
from app.models.user import User, UserRole, UserStatus
from app.config import settings
from app.utils.security import get_password_hash
import random

async def add_reviews_and_rating():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # 1. Создаем тестового пользователя, если его нет
        user_query = select(User).where(User.email == "test_reviewer@example.com")
        user_result = await db.execute(user_query)
        test_user = user_result.scalar_one_or_none()
        
        if not test_user:
            test_user = User(
                email="test_reviewer@example.com",
                first_name="Тестовый",
                last_name="Рецензент",
                hashed_password=get_password_hash("test123456"),
                role=UserRole.STUDENT,
                status=UserStatus.ACTIVE,
                is_email_verified=True
            )
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)
            print(f"✅ Создан тестовый пользователь с ID: {test_user.id}")
        else:
            print(f"✅ Найден тестовый пользователь с ID: {test_user.id}")
        
        # 2. Получаем все активные компании
        companies_query = select(Company).where(Company.status == CompanyStatus.ACTIVE)
        companies_result = await db.execute(companies_query)
        companies = companies_result.scalars().all()
        
        print(f"\n📊 Найдено компаний: {len(companies)}")
        
        # 3. Для каждой компании добавляем отзывы
        reviews_added = 0
        for company in companies:
            # Проверяем, есть ли уже отзывы
            existing_reviews_query = select(Review).where(Review.company_id == company.id)
            existing_reviews_result = await db.execute(existing_reviews_query)
            existing_reviews = existing_reviews_result.scalars().all()
            
            if len(existing_reviews) == 0:
                print(f"\n🏢 Добавляем отзывы для: {company.full_name}")
                
                # Создаем 3-5 отзывов
                num_reviews = random.randint(3, 5)
                reviews = []
                
                review_texts = [
                    "Отличная компания! Хорошие условия труда, дружный коллектив. Рекомендую!",
                    "Работаю здесь уже год, все нравится. Зарплата вовремя, руководство адекватное.",
                    "Хорошее место для старта карьеры. Есть обучение и наставничество.",
                    "Нормальная компания, но есть куда расти. В целом устраивает.",
                    "Отличный коллектив и интересные проекты. Рекомендую!",
                    "Достойная зарплата, хороший соцпакет. Есть перспективы роста.",
                    "Компания заботится о сотрудниках, проводят корпоративы и обучения.",
                    "Сложные задачи, но интересно. Платят хорошо, график гибкий.",
                    "Хорошее руководство, всегда идут навстречу. Работа нравится."
                ]
                
                pros_list = [
                    "Хорошая зарплата, дружный коллектив, обучение",
                    "Гибкий график, удаленка, интересные проекты",
                    "Соцпакет, ДМС, оплата проезда",
                    "Карьерный рост, наставничество, современные технологии",
                    "Отличная атмосфера, комфортный офис, корпоративы"
                ]
                
                cons_list = [
                    "Сложные задачи, иногда переработки",
                    "Бюрократия, много отчетности",
                    "Нет столовой, далеко от метро",
                    "Мало парковочных мест",
                    "Иногда задерживают зарплату"
                ]
                
                for i in range(num_reviews):
                    # Случайный рейтинг (больше высоких оценок)
                    rating = random.choice([5, 5, 5, 5, 4, 4, 4, 4, 3])
                    review = Review(
                        company_id=company.id,
                        user_id=test_user.id,
                        rating=rating,
                        title=f"Отзыв {i+1}",
                        text=random.choice(review_texts),
                        pros=random.choice(pros_list),
                        cons=random.choice(cons_list),
                        is_anonymous=random.choice([True, False]),
                        is_verified=True,
                        is_hidden=False,
                        helpful_count=random.randint(0, 10)
                    )
                    reviews.append(review)
                    db.add(review)
                
                # Рассчитываем средний рейтинг
                total_rating = sum(r.rating for r in reviews)
                avg_rating = total_rating / len(reviews)
                
                company.rating = round(avg_rating, 1)
                company.reviews_count = len(reviews)
                
                print(f"  📝 Добавлено {len(reviews)} отзывов")
                print(f"  ⭐ Рейтинг: {company.rating} (из {company.reviews_count} отзывов)")
                reviews_added += len(reviews)
            else:
                # Обновляем рейтинг на основе существующих отзывов
                total_rating = sum(r.rating for r in existing_reviews)
                avg_rating = total_rating / len(existing_reviews)
                
                company.rating = round(avg_rating, 1)
                company.reviews_count = len(existing_reviews)
                
                print(f"\n🏢 {company.full_name}: уже есть {len(existing_reviews)} отзывов, рейтинг {company.rating}")
        
        await db.commit()
        
        print(f"\n{'='*50}")
        print(f"✅ Всего добавлено отзывов: {reviews_added}")
        print(f"✅ Всего компаний с рейтингом: {len([c for c in companies if c.reviews_count > 0])}")
        print(f"{'='*50}")
        
        # Выводим топ-3 компании
        top_companies = sorted(companies, key=lambda x: x.rating if x.rating else 0, reverse=True)[:3]
        print(f"\n🏆 Топ-3 компании по рейтингу:")
        for i, company in enumerate(top_companies, 1):
            print(f"  {i}. {company.full_name} - ⭐ {company.rating} ({company.reviews_count} отзывов)")

if __name__ == "__main__":
    asyncio.run(add_reviews_and_rating())