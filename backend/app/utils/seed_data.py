"""
Запуск: python -m app.utils.seed_data
Создаёт: админа, теги, тестовые компании, вакансии
"""
import asyncio
from app.database import async_session
from app.models.user import User, UserRole, ApplicantProfile
from app.models.company import Company, VerificationStatus
from app.models.opportunity import (
    Opportunity, OpportunityType, WorkFormat, OpportunityStatus,
    ModerationStatus
)
from app.models.tag import Tag, TagCategory
from app.utils.security import hash_password
from app.config import settings
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import Point


STARTER_TAGS = [
    # Языки
    ("Python", TagCategory.TECHNOLOGY),
    ("JavaScript", TagCategory.TECHNOLOGY),
    ("TypeScript", TagCategory.TECHNOLOGY),
    ("Java", TagCategory.TECHNOLOGY),
    ("C#", TagCategory.TECHNOLOGY),
    ("Go", TagCategory.TECHNOLOGY),
    ("Rust", TagCategory.TECHNOLOGY),
    ("C++", TagCategory.TECHNOLOGY),
    ("PHP", TagCategory.TECHNOLOGY),
    ("Kotlin", TagCategory.TECHNOLOGY),
    ("Swift", TagCategory.TECHNOLOGY),
    ("SQL", TagCategory.TECHNOLOGY),
    # Фреймворки
    ("React", TagCategory.TECHNOLOGY),
    ("Vue.js", TagCategory.TECHNOLOGY),
    ("Angular", TagCategory.TECHNOLOGY),
    ("Django", TagCategory.TECHNOLOGY),
    ("FastAPI", TagCategory.TECHNOLOGY),
    ("Spring", TagCategory.TECHNOLOGY),
    ("Node.js", TagCategory.TECHNOLOGY),
    ("Flask", TagCategory.TECHNOLOGY),
    (".NET", TagCategory.TECHNOLOGY),
    # DevOps / Инструменты
    ("Docker", TagCategory.TECHNOLOGY),
    ("Kubernetes", TagCategory.TECHNOLOGY),
    ("Git", TagCategory.TECHNOLOGY),
    ("Linux", TagCategory.TECHNOLOGY),
    ("AWS", TagCategory.TECHNOLOGY),
    ("PostgreSQL", TagCategory.TECHNOLOGY),
    ("MongoDB", TagCategory.TECHNOLOGY),
    ("Redis", TagCategory.TECHNOLOGY),
    # Data / ML
    ("Machine Learning", TagCategory.TECHNOLOGY),
    ("Data Science", TagCategory.TECHNOLOGY),
    ("TensorFlow", TagCategory.TECHNOLOGY),
    ("PyTorch", TagCategory.TECHNOLOGY),
    # Уровни
    ("Intern", TagCategory.LEVEL),
    ("Junior", TagCategory.LEVEL),
    ("Middle", TagCategory.LEVEL),
    # Тип занятости
    ("Полная занятость", TagCategory.EMPLOYMENT_TYPE),
    ("Частичная занятость", TagCategory.EMPLOYMENT_TYPE),
    ("Проектная работа", TagCategory.EMPLOYMENT_TYPE),
    # Домены
    ("Backend", TagCategory.DOMAIN),
    ("Frontend", TagCategory.DOMAIN),
    ("Fullstack", TagCategory.DOMAIN),
    ("Mobile", TagCategory.DOMAIN),
    ("DevOps", TagCategory.DOMAIN),
    ("Data Engineering", TagCategory.DOMAIN),
    ("QA", TagCategory.DOMAIN),
    ("UX/UI Design", TagCategory.DOMAIN),
    ("GameDev", TagCategory.DOMAIN),
    ("Cybersecurity", TagCategory.DOMAIN),
]


SAMPLE_COMPANIES = [
    {
        "name": "Яндекс",
        "industry": "IT / Поиск / Реклама",
        "city": "Москва",
        "lat": 55.7339, "lng": 37.5880,
        "website": "https://yandex.ru",
    },
    {
        "name": "VK",
        "industry": "IT / Социальные сети",
        "city": "Санкт-Петербург",
        "lat": 59.9343, "lng": 30.3351,
        "website": "https://vk.com",
    },
    {
        "name": "Сбер",
        "industry": "Финтех / Банковское дело",
        "city": "Москва",
        "lat": 55.7616, "lng": 37.6390,
        "website": "https://sber.ru",
    },
    {
        "name": "Тинькофф",
        "industry": "Финтех",
        "city": "Москва",
        "lat": 55.7254, "lng": 37.6320,
        "website": "https://tinkoff.ru",
    },
    {
        "name": "Kaspersky",
        "industry": "Кибербезопасность",
        "city": "Москва",
        "lat": 55.7900, "lng": 37.5795,
        "website": "https://kaspersky.ru",
    },
    {
        "name": "JetBrains",
        "industry": "Инструменты разработки",
        "city": "Санкт-Петербург",
        "lat": 59.9580, "lng": 30.4065,
        "website": "https://jetbrains.com",
    },
    {
        "name": "Positive Technologies",
        "industry": "Кибербезопасность",
        "city": "Москва",
        "lat": 55.7695, "lng": 37.6502,
        "website": "https://ptsecurity.com",
    },
    {
        "name": "Ozon",
        "industry": "E-commerce / Маркетплейс",
        "city": "Москва",
        "lat": 55.7100, "lng": 37.6156,
        "website": "https://ozon.ru",
    },
]


SAMPLE_OPPORTUNITIES = [
    {
        "title": "Стажёр Python-разработчик",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 40000, "salary_max": 60000,
        "tags": ["Python", "Django", "SQL", "Git", "Intern"],
    },
    {
        "title": "Junior Frontend Developer (React)",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.REMOTE,
        "salary_min": 60000, "salary_max": 100000,
        "tags": ["JavaScript", "React", "TypeScript", "Junior", "Frontend"],
    },
    {
        "title": "Менторская программа по Data Science",
        "type": OpportunityType.MENTORSHIP,
        "work_format": WorkFormat.REMOTE,
        "tags": ["Python", "Machine Learning", "Data Science"],
    },
    {
        "title": "Хакатон «Code Sprint 2026»",
        "type": OpportunityType.EVENT,
        "work_format": WorkFormat.OFFICE,
        "tags": ["Python", "JavaScript", "Docker"],
    },
    {
        "title": "Стажёр QA Engineer",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.HYBRID,
        "salary_min": 35000, "salary_max": 55000,
        "tags": ["QA", "SQL", "Python", "Git", "Intern"],
    },
    {
        "title": "Junior Java Developer",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 70000, "salary_max": 120000,
        "tags": ["Java", "Spring", "SQL", "Docker", "Junior", "Backend"],
    },
]


async def seed():
    async with async_session() as db:
        # 1. Проверка — не засеивать повторно
        existing_admin = await db.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        if existing_admin.scalar_one_or_none():
            print("✅ База уже засеяна, пропускаем")
            return

        # 2. Создание администратора
        admin = User(
            email=settings.ADMIN_EMAIL,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            display_name="Администратор",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        await db.flush()
        print(f"👤 Админ создан: {settings.ADMIN_EMAIL}")

        # 3. Создание тегов
        tag_objects = {}
        for name, category in STARTER_TAGS:
            tag = Tag(
                name=name,
                category=category,
                is_approved=True,
                created_by=admin.id,
            )
            db.add(tag)
            tag_objects[name] = tag
        await db.flush()
        print(f"🏷️  Создано {len(STARTER_TAGS)} тегов")

        # 4. Создание компаний с работодателями
        companies = []
        for i, comp_data in enumerate(SAMPLE_COMPANIES):
            employer = User(
                email=f"hr@{comp_data['name'].lower().replace(' ', '')}.ru",
                password_hash=hash_password("demo123"),
                display_name=f"HR {comp_data['name']}",
                role=UserRole.EMPLOYER,
            )
            db.add(employer)
            await db.flush()

            company = Company(
                owner_id=employer.id,
                name=comp_data["name"],
                industry=comp_data["industry"],
                city=comp_data["city"],
                website=comp_data["website"],
                verification_status=VerificationStatus.VERIFIED,
                verified_by=admin.id,
            )
            db.add(company)
            companies.append((company, comp_data))

        await db.flush()
        print(f"🏢 Создано {len(SAMPLE_COMPANIES)} компаний")

        # 5. Создание возможностей
        opp_count = 0
        for company, comp_data in companies:
            for opp_data in SAMPLE_OPPORTUNITIES[:3]:  # по 3 на компанию
                opp = Opportunity(
                    company_id=company.id,
                    title=opp_data["title"],
                    description=f"Описание позиции {opp_data['title']} в компании {comp_data['name']}. "
                                f"Мы ищем мотивированных кандидатов.",
                    type=opp_data["type"],
                    work_format=opp_data["work_format"],
                    salary_min=opp_data.get("salary_min"),
                    salary_max=opp_data.get("salary_max"),
                    city=comp_data["city"],
                    latitude=comp_data["lat"],
                    longitude=comp_data["lng"],
                    location=from_shape(
                        Point(comp_data["lng"], comp_data["lat"]),
                        srid=4326
                    ),
                    status=OpportunityStatus.ACTIVE,
                    moderation_status=ModerationStatus.APPROVED,
                )
                # Привязка тегов
                for tag_name in opp_data.get("tags", []):
                    if tag_name in tag_objects:
                        opp.tags.append(tag_objects[tag_name])
                db.add(opp)
                opp_count += 1

        await db.flush()
        print(f"📋 Создано {opp_count} возможностей")

        # 6. Создание тестовых соискателей
        for i in range(5):
            applicant = User(
                email=f"student{i+1}@university.ru",
                password_hash=hash_password("demo123"),
                display_name=f"Студент {i+1}",
                role=UserRole.APPLICANT,
            )
            db.add(applicant)
            await db.flush()
            profile = ApplicantProfile(
                user_id=applicant.id,
                first_name=f"Иван{i+1}",
                last_name=f"Иванов{i+1}",
                university="МГТУ им. Н.Э. Баумана",
                course=3 + (i % 3),
            )
            db.add(profile)
        print("🎓 Создано 5 тестовых соискателей")

        await db.commit()
        print("\n✅ Сидинг завершён успешно!")


if __name__ == "__main__":
    asyncio.run(seed())