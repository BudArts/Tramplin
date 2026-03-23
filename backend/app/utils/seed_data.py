"""
Скрипт для заполнения базы тестовыми данными
"""
import asyncio
import random
from datetime import datetime, timedelta, date
from passlib.context import CryptContext

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.user import User, UserRole, UserStatus
from app.models.company import Company, CompanyStatus, VerificationStatus
from app.models.opportunity import Opportunity, OpportunityType, OpportunityStatus, WorkFormat
from app.models.tag import Tag, TagCategory
from app.models.review import Review
from app.models.notification import Notification, NotificationType

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Тестовые теги по категориям
TAGS_BY_CATEGORY = {
    TagCategory.TECHNOLOGY: [
        "Python", "JavaScript", "TypeScript", "React", "Vue.js", "Angular",
        "Node.js", "Django", "FastAPI", "PostgreSQL", "MongoDB", "Redis",
        "Docker", "Kubernetes", "AWS", "Go", "Rust", "Java", "C#", "PHP"
    ],
    TagCategory.LEVEL: [
        "Junior", "Middle", "Senior", "Lead", "Intern", "Trainee"
    ],
    TagCategory.EMPLOYMENT_TYPE: [
        "Полная занятость", "Частичная занятость", "Стажировка", 
        "Проектная работа", "Фриланс", "Контракт"
    ],
    TagCategory.DOMAIN: [
        "Финтех", "E-commerce", "EdTech", "HealthTech", "GameDev", 
        "AI/ML", "Blockchain", "Cybersecurity", "IoT", "Mobile",
        "SaaS", "B2B", "B2C", "Стартап"
    ],
    TagCategory.CUSTOM: [
        "Удалённая работа", "Гибридный формат", "Офис", "Гибкий график",
        "ДМС", "Обучение", "Менторство", "Карьерный рост"
    ]
}

# Тестовые компании
COMPANIES = [
    {"inn": "7707083893", "name": "ТехноСтарт", "full_name": 'ООО "ТехноСтарт"', "description": "IT-компания", "industry": "IT", "city": "Москва", "website": "https://technostart.ru"},
    {"inn": "7708123456", "name": "DataMind", "full_name": 'ООО "ДатаМайнд"', "description": "Анализ данных", "industry": "Data Science", "city": "Санкт-Петербург", "website": "https://datamind.ru"},
    {"inn": "7709234567", "name": "CloudBase", "full_name": 'ООО "КлаудБейс"', "description": "Облачные решения", "industry": "Cloud", "city": "Новосибирск", "website": "https://cloudbase.ru"},
    {"inn": "7710345678", "name": "FinTech Pro", "full_name": 'ООО "ФинТех Про"', "description": "Финтех", "industry": "Финтех", "city": "Москва", "website": "https://fintechpro.ru"},
    {"inn": "7711456789", "name": "EduPlatform", "full_name": 'ООО "ЭдуПлатформ"', "description": "EdTech", "industry": "EdTech", "city": "Казань", "website": "https://eduplatform.ru"},
    {"inn": "7712567890", "name": "GameStudio X", "full_name": 'ООО "ГеймСтудио"', "description": "GameDev", "industry": "GameDev", "city": "Москва", "website": "https://gamestudiox.ru"},
    {"inn": "7713678901", "name": "SecureNet", "full_name": 'ООО "СекьюрНет"', "description": "Кибербезопасность", "industry": "Security", "city": "Екатеринбург", "website": "https://securenet.ru"},
    {"inn": "7714789012", "name": "MedTech Solutions", "full_name": 'ООО "МедТех"', "description": "HealthTech", "industry": "HealthTech", "city": "Москва", "website": "https://medtech.ru"},
    {"inn": "7715890123", "name": "RoboLogic", "full_name": 'ООО "РобоЛоджик"', "description": "Робототехника", "industry": "Robotics", "city": "Санкт-Петербург", "website": "https://robologic.ru"},
    {"inn": "7716901234", "name": "AI Labs", "full_name": 'ООО "ЭйАй Лабс"', "description": "AI/ML", "industry": "AI/ML", "city": "Москва", "website": "https://ailabs.ru"},
]

OPPORTUNITY_TEMPLATES = [
    {"type": OpportunityType.INTERNSHIP, "title": "Стажировка: {role}"},
    {"type": OpportunityType.VACANCY, "title": "{role} (Junior)"},
    {"type": OpportunityType.VACANCY, "title": "{role} (Middle)"},
    {"type": OpportunityType.MENTORSHIP, "title": "Менторство по {topic}"},
    {"type": OpportunityType.EVENT, "title": "Митап: {event}"},
]

ROLES = ["Frontend Developer", "Backend Developer", "Data Analyst", "DevOps Engineer", "QA Engineer"]
TOPICS = ["Python", "JavaScript", "Data Science", "DevOps", "Карьерный рост"]
EVENTS = ["Новые технологии", "Code Review", "Архитектура", "Agile"]


async def seed_database():
    """Заполнить базу тестовыми данными"""
    
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("🌱 Начинаем заполнение базы данных...")
        
        # Проверяем, есть ли уже данные
        existing_tags = await db.execute(select(Tag).limit(1))
        if existing_tags.scalar_one_or_none():
            print("⚠️  База уже содержит данные!")
            print("   Для пересоздания выполните:")
            print("   docker compose down -v && docker compose up -d")
            print("   docker compose exec backend alembic upgrade head")
            print("   docker compose exec backend python -m app.utils.seed_data")
            return
        
        # 1. Создаём теги
        print("📌 Создаём теги...")
        tags = []
        for category, tag_names in TAGS_BY_CATEGORY.items():
            for tag_name in tag_names:
                tag = Tag(name=tag_name, category=category, is_approved=True, usage_count=random.randint(10, 100))
                db.add(tag)
                tags.append(tag)
        await db.commit()
        print(f"   ✅ Создано {len(tags)} тегов")
        
        # 2. Создаём пользователей
        print("👥 Создаём пользователей...")
        users = []
        
        # Админ
        admin = User(
            email="admin@tramplin.ru",
            hashed_password=pwd_context.hash("admin123"),
            first_name="Админ",
            last_name="Системы",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_email_verified=True
        )
        db.add(admin)
        users.append(admin)
        
        # Кураторы
        for i in range(2):
            curator = User(
                email=f"curator{i+1}@tramplin.ru",
                hashed_password=pwd_context.hash("curator123"),
                first_name=f"Куратор{i+1}",
                last_name="Платформы",
                role=UserRole.CURATOR,
                status=UserStatus.ACTIVE,
                is_email_verified=True
            )
            db.add(curator)
            users.append(curator)
        
        # Владельцы компаний
        company_owners = []
        for i in range(10):
            owner = User(
                email=f"company{i+1}@example.com",
                hashed_password=pwd_context.hash("password123"),
                first_name=f"Владелец{i+1}",
                last_name="Компании",
                role=UserRole.COMPANY,
                status=UserStatus.ACTIVE,
                is_email_verified=True
            )
            db.add(owner)
            company_owners.append(owner)
            users.append(owner)
        
        # Студенты
        regular_users = []
        first_names = ["Иван", "Мария", "Алексей", "Елена", "Дмитрий", "Анна", "Сергей", "Ольга"]
        last_names = ["Иванов", "Петрова", "Сидоров", "Козлова", "Смирнов", "Новикова", "Морозов", "Волкова"]
        universities = ["МГУ", "СПбГУ", "МФТИ", "ВШЭ", "ИТМО", "Бауманка", "МИСИС", "РАНХиГС"]
        
        for i in range(8):
            user = User(
                email=f"user{i+1}@example.com",
                hashed_password=pwd_context.hash("password123"),
                first_name=first_names[i],
                last_name=last_names[i],
                role=UserRole.STUDENT,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                university=universities[i],
                course=random.randint(1, 4)
            )
            db.add(user)
            regular_users.append(user)
            users.append(user)
        
        await db.commit()
        print(f"   ✅ Создано {len(users)} пользователей")
        
        # 3. Создаём компании
        print("🏢 Создаём компании...")
        companies = []
        for i, data in enumerate(COMPANIES):
            company = Company(
                **data,
                owner_id=company_owners[i].id,
                status=CompanyStatus.ACTIVE,
                verification_status=VerificationStatus.VERIFIED,
                email=f"info@company{i+1}.ru",
                phone=f"+7 (495) {random.randint(100,999)}-{random.randint(10,99)}-{random.randint(10,99)}",
                rating=round(random.uniform(3.5, 5.0), 1),
                reviews_count=random.randint(5, 50)
            )
            db.add(company)
            companies.append(company)
        await db.commit()
        print(f"   ✅ Создано {len(companies)} компаний")
        
         # 4. Создаём возможности
        print("📋 Создаём возможности...")
        opportunities_count = 0
        
        for company in companies:
            used_templates = random.sample(OPPORTUNITY_TEMPLATES, 5)
            
            for template in used_templates:
                if template["type"] == OpportunityType.MENTORSHIP:
                    title = template["title"].format(topic=random.choice(TOPICS))
                elif template["type"] == OpportunityType.EVENT:
                    title = template["title"].format(event=random.choice(EVENTS))
                else:
                    title = template["title"].format(role=random.choice(ROLES))
                
                salary_min = None
                salary_max = None
                if template["type"] == OpportunityType.VACANCY:
                    salary_min = random.randint(50, 100) * 1000
                    salary_max = random.randint(120, 250) * 1000
                elif template["type"] == OpportunityType.INTERNSHIP:
                    salary_min = random.randint(20, 40) * 1000
                    salary_max = random.randint(50, 80) * 1000
                
                # Создаем объект
                opp = Opportunity(
                    company_id=company.id,
                    title=title,
                    description=f"Отличная возможность для развития в компании {company.name}. "
                               f"Мы ищем талантливых и мотивированных людей!",
                    type=template["type"],
                    work_format=random.choice(list(WorkFormat)),
                    status=OpportunityStatus.ACTIVE,
                    salary_min=salary_min,
                    salary_max=salary_max,
                    city=company.city,
                    views_count=random.randint(50, 500),
                    applications_count=random.randint(5, 30),
                    expires_at=date.today() + timedelta(days=random.randint(30, 90)),
                    published_at=datetime.utcnow() # Замена utcnow()
                )
                
                # Привязываем теги СРАЗУ ЖЕ ДО коммита
                opp.tags = random.sample(tags, random.randint(3, 6))
                
                db.add(opp)
                opportunities_count += 1

        await db.commit()
        print(f"   ✅ Создано {opportunities_count} возможностей с тегами")
        
        # 5. Создаём отзывы
        print("⭐ Создаём отзывы...")
        reviews = []
        for company in companies:
            for user in random.sample(regular_users, random.randint(3, 5)):
                review = Review(
                    company_id=company.id,
                    user_id=user.id,
                    rating=random.randint(3, 5),
                    title="Отличная компания!",
                    text="Хороший коллектив",
                    pros="Развитие",
                    cons="Много работы",
                    helpful_count=random.randint(0, 20)
                )
                db.add(review)
                reviews.append(review)
        await db.commit()
        print(f"   ✅ Создано {len(reviews)} отзывов")
        
        # 6. Уведомления
        print("🔔 Создаём уведомления...")
        for user in users:
            db.add(Notification(
                user_id=user.id,
                type=NotificationType.SYSTEM,
                title="Добро пожаловать!",
                message=f"Привет, {user.first_name}!",
                is_read=random.choice([True, False])
            ))
        await db.commit()
        print(f"   ✅ Создано {len(users)} уведомлений")
        
        print("\n" + "="*50)
        print("✨ База данных заполнена!")
        print("="*50)
        print(f"\n📊 Тегов: {len(tags)}, Пользователей: {len(users)}, Компаний: {len(companies)}")
        print(f"   Возможностей: {len(opportunities)}, Отзывов: {len(reviews)}")
        print("\n🔐 Аккаунты: admin@tramplin.ru / admin123")
        print("             company1@example.com / password123")
        print("             user1@example.com / password123")


if __name__ == "__main__":
    asyncio.run(seed_database())