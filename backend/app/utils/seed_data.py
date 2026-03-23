# backend/app/utils/seed_data.py
"""
Заполнение базы данных тестовыми данными.

Запуск:
    cd backend
    python -m app.utils.seed_data
"""
import asyncio
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import select

from app.database import async_session_maker
# ИСПРАВЛЕНО: убраны несуществующие импорты
from app.models.user import User, UserRole, UserStatus
from app.models.company import Company, CompanyStatus, CompanySize
# ИСПРАВЛЕНО: изменен импорт тегов
from app.models.tag import Tag, TagCategory, TagSynonym, opportunity_tags, user_tags
# ИСПРАВЛЕНО: используем AuthService вместо hash_password
from app.services.auth_service import AuthService
from app.config import settings

# Попробуем импортировать остальные модели
try:
    from app.models.opportunity import Opportunity, OpportunityType, WorkFormat, OpportunityStatus, ModerationStatus
    HAS_OPPORTUNITY = True
except ImportError:
    HAS_OPPORTUNITY = False
    print("⚠️ Модель Opportunity не найдена, пропускаем создание возможностей")


# ============================================================
# ДАННЫЕ ДЛЯ СИДИНГА
# ============================================================

TAGS_DATA = [
    # Языки программирования
    ("Python", TagCategory.TECHNOLOGY),
    ("JavaScript", TagCategory.TECHNOLOGY),
    ("TypeScript", TagCategory.TECHNOLOGY),
    ("Java", TagCategory.TECHNOLOGY),
    ("C#", TagCategory.TECHNOLOGY),
    ("C++", TagCategory.TECHNOLOGY),
    ("Go", TagCategory.TECHNOLOGY),
    ("Rust", TagCategory.TECHNOLOGY),
    ("PHP", TagCategory.TECHNOLOGY),
    ("Kotlin", TagCategory.TECHNOLOGY),
    ("Swift", TagCategory.TECHNOLOGY),
    ("Ruby", TagCategory.TECHNOLOGY),
    ("Scala", TagCategory.TECHNOLOGY),
    ("SQL", TagCategory.TECHNOLOGY),
    ("R", TagCategory.TECHNOLOGY),
    # Фреймворки и библиотеки
    ("React", TagCategory.TECHNOLOGY),
    ("Vue.js", TagCategory.TECHNOLOGY),
    ("Angular", TagCategory.TECHNOLOGY),
    ("Next.js", TagCategory.TECHNOLOGY),
    ("Django", TagCategory.TECHNOLOGY),
    ("FastAPI", TagCategory.TECHNOLOGY),
    ("Flask", TagCategory.TECHNOLOGY),
    ("Spring", TagCategory.TECHNOLOGY),
    ("Node.js", TagCategory.TECHNOLOGY),
    (".NET", TagCategory.TECHNOLOGY),
    ("Express.js", TagCategory.TECHNOLOGY),
    ("Laravel", TagCategory.TECHNOLOGY),
    ("React Native", TagCategory.TECHNOLOGY),
    ("Flutter", TagCategory.TECHNOLOGY),
    # Базы данных и инфраструктура
    ("PostgreSQL", TagCategory.TECHNOLOGY),
    ("MySQL", TagCategory.TECHNOLOGY),
    ("MongoDB", TagCategory.TECHNOLOGY),
    ("Redis", TagCategory.TECHNOLOGY),
    ("Elasticsearch", TagCategory.TECHNOLOGY),
    ("Docker", TagCategory.TECHNOLOGY),
    ("Kubernetes", TagCategory.TECHNOLOGY),
    ("Git", TagCategory.TECHNOLOGY),
    ("Linux", TagCategory.TECHNOLOGY),
    ("AWS", TagCategory.TECHNOLOGY),
    ("CI/CD", TagCategory.TECHNOLOGY),
    ("Nginx", TagCategory.TECHNOLOGY),
    # Data / ML / AI
    ("Machine Learning", TagCategory.TECHNOLOGY),
    ("Deep Learning", TagCategory.TECHNOLOGY),
    ("Data Science", TagCategory.TECHNOLOGY),
    ("TensorFlow", TagCategory.TECHNOLOGY),
    ("PyTorch", TagCategory.TECHNOLOGY),
    ("Pandas", TagCategory.TECHNOLOGY),
    ("Computer Vision", TagCategory.TECHNOLOGY),
    ("NLP", TagCategory.TECHNOLOGY),
    # Уровни
    ("Intern", TagCategory.LEVEL),
    ("Junior", TagCategory.LEVEL),
    ("Middle", TagCategory.LEVEL),
    ("Senior", TagCategory.LEVEL),
    # Тип занятости
    ("Полная занятость", TagCategory.EMPLOYMENT_TYPE),
    ("Частичная занятость", TagCategory.EMPLOYMENT_TYPE),
    ("Проектная работа", TagCategory.EMPLOYMENT_TYPE),
    ("Стажировка", TagCategory.EMPLOYMENT_TYPE),
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
    ("Product Management", TagCategory.DOMAIN),
    ("System Administration", TagCategory.DOMAIN),
]

SYNONYMS_DATA = [
    ("JavaScript", "JS"),
    ("TypeScript", "TS"),
    ("Machine Learning", "ML"),
    ("Deep Learning", "DL"),
    ("Natural Language Processing", "NLP"),
    ("PostgreSQL", "Postgres"),
    ("Kubernetes", "K8s"),
    ("Continuous Integration", "CI/CD"),
]

# 12 компаний
COMPANIES_DATA = [
    {
        "name": "Яндекс",
        "inn": "7736207543",
        "description": "Технологическая компания, которая создаёт умные продукты и сервисы на основе машинного обучения. Поиск, Карты, Маркет, Музыка, Облако и многое другое.",
        "industry": "IT / Поиск / Облачные технологии",
        "website": "https://yandex.ru",
        "city": "Москва",
    },
    {
        "name": "VK",
        "inn": "7743001840",
        "description": "Крупнейшая российская технологическая компания. Социальные сети, мессенджеры, игры, облачные сервисы и образовательные проекты.",
        "industry": "IT / Социальные сети / Медиа",
        "website": "https://vk.com",
        "city": "Санкт-Петербург",
    },
    {
        "name": "Сбер",
        "inn": "7707083893",
        "description": "Крупнейший банк России, активно развивающий IT-направление: AI, Big Data, облачные платформы, кибербезопасность.",
        "industry": "Финтех / Банковское дело / AI",
        "website": "https://sber.ru",
        "city": "Москва",
    },
    {
        "name": "Тинькофф",
        "inn": "7710140679",
        "description": "Онлайн-экосистема финансовых и лайфстайл-сервисов. Один из крупнейших IT-работодателей России.",
        "industry": "Финтех / Онлайн-банкинг",
        "website": "https://tinkoff.ru",
        "city": "Москва",
    },
    {
        "name": "Kaspersky",
        "inn": "7713140469",
        "description": "Международная компания, специализирующаяся на разработке систем защиты от компьютерных вирусов, спама, хакерских атак.",
        "industry": "Кибербезопасность",
        "website": "https://kaspersky.ru",
        "city": "Москва",
    },
    {
        "name": "JetBrains",
        "inn": "7801392271",
        "description": "Разработчик инструментов для разработчиков: IntelliJ IDEA, PyCharm, WebStorm, Kotlin и другие продукты.",
        "industry": "Инструменты разработки / IDE",
        "website": "https://jetbrains.com",
        "city": "Санкт-Петербург",
    },
    {
        "name": "Positive Technologies",
        "inn": "7718668887",
        "description": "Лидер рынка результативной кибербезопасности. Разработка продуктов для обнаружения и предотвращения кибератак.",
        "industry": "Кибербезопасность / Информационная безопасность",
        "website": "https://ptsecurity.com",
        "city": "Москва",
    },
    {
        "name": "Ozon",
        "inn": "7704217370",
        "description": "Одна из крупнейших e-commerce платформ России. Маркетплейс, логистика, финтех-сервисы.",
        "industry": "E-commerce / Маркетплейс",
        "website": "https://ozon.ru",
        "city": "Москва",
    },
    {
        "name": "Avito",
        "inn": "7710044140",
        "description": "Крупнейшая российская платформа объявлений. Высоконагруженные системы, ML, мобильная разработка.",
        "industry": "Классифайды / E-commerce",
        "website": "https://avito.ru",
        "city": "Москва",
    },
    {
        "name": "1С",
        "inn": "7709860320",
        "description": "Крупнейший разработчик бизнес-приложений в России. ERP, бухгалтерия, управление предприятием.",
        "industry": "Enterprise Software / ERP",
        "website": "https://1c.ru",
        "city": "Москва",
    },
    {
        "name": "Контур",
        "inn": "6663003127",
        "description": "Экосистема облачных сервисов для бизнеса: электронный документооборот, отчётность, бухгалтерия.",
        "industry": "SaaS / B2B / Облачные сервисы",
        "website": "https://kontur.ru",
        "city": "Екатеринбург",
    },
    {
        "name": "2ГИС",
        "inn": "5405276278",
        "description": "Картографический сервис и справочник организаций. Собственные карты, навигация, геоаналитика.",
        "industry": "Геоинформационные системы / Карты",
        "website": "https://2gis.ru",
        "city": "Новосибирск",
    },
]

# ИСПРАВЛЕНО: Убран PrivacyLevel, данные адаптированы под новую модель User
APPLICANTS_DATA = [
    {
        "email": "ivan.petrov@university.ru",
        "first_name": "Иван",
        "last_name": "Петров",
        "patronymic": "Алексеевич",
        "university": "МГТУ им. Н.Э. Баумана",
        "faculty": "Информатика и системы управления",
        "course": 3,
        "bio": "Студент 3 курса, увлекаюсь бэкенд-разработкой на Python. Участвовал в нескольких хакатонах. Ищу стажировку в крупной IT-компании.",
        "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "Docker", "Git"],
    },
    {
        "email": "anna.sidorova@mail.ru",
        "first_name": "Анна",
        "last_name": "Сидорова",
        "patronymic": "Игоревна",
        "university": "НИУ ВШЭ",
        "faculty": "Факультет компьютерных наук",
        "course": 4,
        "bio": "Фронтенд-разработчик с опытом в React и TypeScript. Пишу pet-проекты, веду блог о веб-разработке.",
        "skills": ["JavaScript", "React", "TypeScript", "Next.js", "Git"],
    },
    {
        "email": "dmitry.kozlov@student.msu.ru",
        "first_name": "Дмитрий",
        "last_name": "Козлов",
        "patronymic": "Сергеевич",
        "university": "МГУ им. М.В. Ломоносова",
        "faculty": "Факультет вычислительной математики и кибернетики",
        "course": 2,
        "bio": "Изучаю Machine Learning и Data Science. Kaggle: серебряная медаль в одном из соревнований.",
        "skills": ["Python", "Machine Learning", "Data Science", "Pandas", "PyTorch", "SQL"],
    },
    {
        "email": "elena.volkova@gmail.com",
        "first_name": "Елена",
        "last_name": "Волкова",
        "university": "ИТМО",
        "faculty": "Факультет информационных технологий и программирования",
        "course": None,
        "bio": "Выпускница ИТМО, ищу первую работу в области QA. Прошла курсы по тестированию, знаю SQL и Python для автотестов.",
        "skills": ["QA", "Python", "SQL", "Git", "Linux"],
    },
    {
        "email": "alexey.morozov@yandex.ru",
        "first_name": "Алексей",
        "last_name": "Морозов",
        "patronymic": "Дмитриевич",
        "university": "УрФУ",
        "faculty": "Институт радиоэлектроники и информационных технологий",
        "course": 4,
        "bio": "Full-stack разработчик. Люблю Java и Spring. Участвую в open-source проектах.",
        "skills": ["Java", "Spring", "JavaScript", "React", "PostgreSQL", "Docker", "Fullstack"],
    },
    {
        "email": "maria.kuznetsova@mail.ru",
        "first_name": "Мария",
        "last_name": "Кузнецова",
        "university": "СПбГУ",
        "faculty": "Математико-механический факультет",
        "course": 3,
        "bio": "Увлекаюсь мобильной разработкой. Написала несколько приложений на Flutter и опубликовала в Google Play.",
        "skills": ["Flutter", "Kotlin", "Mobile", "Git"],
    },
    {
        "email": "nikita.sokolov@outlook.com",
        "first_name": "Никита",
        "last_name": "Соколов",
        "university": "НГУ",
        "faculty": "Факультет информационных технологий",
        "course": 2,
        "bio": "Начинающий DevOps-инженер. Люблю Linux, Docker и автоматизацию. Администрирую сервера для хобби-проектов.",
        "skills": ["Linux", "Docker", "Kubernetes", "CI/CD", "Git", "Python", "DevOps"],
    },
    {
        "email": "olga.smirnova@student.ru",
        "first_name": "Ольга",
        "last_name": "Смирнова",
        "university": "СПбПУ",
        "faculty": "Институт компьютерных наук и технологий",
        "course": 4,
        "bio": "Интересуюсь Data Engineering и Big Data. Работала с Spark и Kafka.",
        "skills": ["Python", "SQL", "Data Engineering"],
    },
    {
        "email": "pavel.volkov@mail.ru",
        "first_name": "Павел",
        "last_name": "Волков",
        "university": "МИФИ",
        "faculty": "Факультет кибернетики и информационной безопасности",
        "course": 3,
        "bio": "Увлекаюсь кибербезопасностью и reverse engineering. Участник CTF соревнований.",
        "skills": ["Python", "Cybersecurity", "Linux", "C++"],
    },
    {
        "email": "ekaterina.nikolaeva@yandex.ru",
        "first_name": "Екатерина",
        "last_name": "Николаева",
        "university": "РЭУ им. Плеханова",
        "faculty": "Бизнес-информатика",
        "course": 4,
        "bio": "Хочу стать Product Manager в IT. Прошла курсы по управлению продуктами.",
        "skills": ["Product Management"],
    },
    {
        "email": "andrey.medvedev@gmail.com",
        "first_name": "Андрей",
        "last_name": "Медведев",
        "university": "МФТИ",
        "faculty": "Факультет радиотехники и кибернетики",
        "course": 5,
        "bio": "Выпускник, специализируюсь на Computer Vision и Deep Learning.",
        "skills": ["Python", "Computer Vision", "Deep Learning", "PyTorch", "TensorFlow"],
    },
    {
        "email": "tatyana.kozina@student.ru",
        "first_name": "Татьяна",
        "last_name": "Козина",
        "university": "СГУ",
        "faculty": "Факультет компьютерных наук",
        "course": 3,
        "bio": "Интересуюсь UX/UI дизайном и фронтенд-разработкой.",
        "skills": ["UX/UI Design", "JavaScript", "React"],
    },
]


# ============================================================
# ОСНОВНАЯ ФУНКЦИЯ СИДИНГА
# ============================================================

async def seed():
    # ИСПРАВЛЕНО: используем async_session_maker
    async with async_session_maker() as db:
        # === Проверка: не засеивать повторно ===
        existing = await db.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        if existing.scalar_one_or_none():
            print("✅ База уже засеяна, пропускаем")
            return

        print("🌱 Начинаем заполнение базы данных...\n")

        # === 1. Администратор ===
        admin = User(
            email=settings.ADMIN_EMAIL,
            # ИСПРАВЛЕНО: используем AuthService.hash_password
            hashed_password=AuthService.hash_password(settings.ADMIN_PASSWORD),
            first_name="Администратор",
            last_name="Системы",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_email_verified=True,
        )
        db.add(admin)
        await db.flush()
        print(f"👤 Админ: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")

        # === 2. Теги ===
        tag_map = {}
        for name, category in TAGS_DATA:
            tag = Tag(
                name=name,
                category=category,
                is_approved=True,
                usage_count=0,
                created_by=admin.id,
            )
            db.add(tag)
            tag_map[name] = tag

        await db.flush()
        print(f"🏷️  Создано {len(TAGS_DATA)} тегов")

        # Синонимы
        synonym_count = 0
        for tag_name, synonym_name in SYNONYMS_DATA:
            if tag_name in tag_map:
                synonym = TagSynonym(
                    tag_id=tag_map[tag_name].id,
                    synonym=synonym_name,
                )
                db.add(synonym)
                synonym_count += 1
        await db.flush()
        print(f"🔄 Создано {synonym_count} синонимов")

        # === 3. Компании и работодатели ===
        companies = []
        for i, comp_data in enumerate(COMPANIES_DATA):
            email_name = comp_data["name"].lower().replace(" ", "").replace(".", "")
            employer = User(
                email=f"hr@{email_name}.ru",
                hashed_password=AuthService.hash_password("demo123"),
                first_name="HR",
                last_name=comp_data["name"],
                role=UserRole.COMPANY,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
            )
            db.add(employer)
            await db.flush()

            # ИСПРАВЛЕНО: используем новые поля Company
            company = Company(
                inn=comp_data["inn"],
                full_name=comp_data["name"],
                short_name=comp_data["name"],
                brand_name=comp_data["name"],
                email=f"hr@{email_name}.ru",
                website=comp_data.get("website"),
                industry=comp_data.get("industry"),
                description=comp_data.get("description"),
                status=CompanyStatus.ACTIVE,
                is_email_verified=True,
                verified_at=datetime.now(timezone.utc),
            )
            db.add(company)
            await db.flush()
            
            # Привязываем пользователя к компании
            employer.company_id = company.id
            
            companies.append((company, comp_data))

        await db.flush()
        print(f"🏢 Создано {len(COMPANIES_DATA)} компаний с работодателями")

        # === 4. Соискатели ===
        # ИСПРАВЛЕНО: Теперь все данные хранятся в User, а не в ApplicantProfile
        applicants = []
        for app_data in APPLICANTS_DATA:
            applicant = User(
                email=app_data["email"],
                hashed_password=AuthService.hash_password("demo123"),
                first_name=app_data["first_name"],
                last_name=app_data["last_name"],
                patronymic=app_data.get("patronymic"),
                role=UserRole.STUDENT,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                # Поля профиля студента (теперь в User)
                university=app_data.get("university"),
                faculty=app_data.get("faculty"),
                course=app_data.get("course"),
                bio=app_data.get("bio"),
            )
            db.add(applicant)
            await db.flush()

            # ИСПРАВЛЕНО: привязываем навыки через user_tags вместо applicant_tags
            for skill_name in app_data.get("skills", []):
                if skill_name in tag_map:
                    await db.execute(
                        user_tags.insert().values(
                            user_id=applicant.id,
                            tag_id=tag_map[skill_name].id,
                        )
                    )

            applicants.append(applicant)

        await db.flush()
        print(f"🎓 Создано {len(APPLICANTS_DATA)} соискателей")

        # === 5. Куратор ===
        curator = User(
            email="curator@tramplin.ru",
            hashed_password=AuthService.hash_password("curator123"),
            first_name="Куратор",
            last_name="Платформы",
            role=UserRole.CURATOR,
            status=UserStatus.ACTIVE,
            is_email_verified=True,
        )
        db.add(curator)
        await db.flush()
        print(f"🛡️  Куратор: curator@tramplin.ru / curator123")

        # === Финализация ===
        await db.commit()

        print(f"\n{'='*50}")
        print(f"✅ Сидинг завершён успешно!")
        print(f"{'='*50}")
        print(f"\n📊 Итого:")
        print(f"   Пользователей: {1 + len(COMPANIES_DATA) + len(APPLICANTS_DATA) + 1}")
        print(f"   Компаний:      {len(COMPANIES_DATA)}")
        print(f"   Тегов:         {len(TAGS_DATA)}")
        print(f"\n🔐 Учётные записи для тестирования:")
        print(f"   Админ:         {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        print(f"   Куратор:       curator@tramplin.ru / curator123")
        print(f"   Работодатели:  hr@яндекс.ru / demo123 (и др.)")
        print(f"   Соискатели:    ivan.petrov@university.ru / demo123 (и др.)")
        print(f"\n   Все тестовые пароли: demo123")


if __name__ == "__main__":
    asyncio.run(seed())