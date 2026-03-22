"""
Заполнение базы данных тестовыми данными.

Запуск:
    cd backend
    python -m app.utils.seed_data
"""
import asyncio
from datetime import datetime, date, timedelta, timezone
from app.models.tag import opportunity_tags
from sqlalchemy import select
from app.models.tag import applicant_tags
from app.database import async_session
from app.models.user import User, UserRole, ApplicantProfile, PrivacyLevel
from app.models.company import Company, VerificationStatus, TrustLevel
from app.models.opportunity import (
    Opportunity, OpportunityType, WorkFormat,
    OpportunityStatus, ModerationStatus,
)
from app.models.tag import Tag, TagCategory, TagSynonym
from app.utils.security import hash_password
from app.config import settings


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

# 10 компаний (оставляем как есть)
COMPANIES_DATA = [
    {
        "name": "Яндекс",
        "description": "Технологическая компания, которая создаёт умные продукты и сервисы на основе машинного обучения. Поиск, Карты, Маркет, Музыка, Облако и многое другое.",
        "industry": "IT / Поиск / Облачные технологии",
        "website": "https://yandex.ru",
        "city": "Москва",
        "lat": 55.7339,
        "lng": 37.5880,
        "social_links": ["https://habr.com/company/yandex", "https://t.me/yandex"],
    },
    {
        "name": "VK",
        "description": "Крупнейшая российская технологическая компания. Социальные сети, мессенджеры, игры, облачные сервисы и образовательные проекты.",
        "industry": "IT / Социальные сети / Медиа",
        "website": "https://vk.com",
        "city": "Санкт-Петербург",
        "lat": 59.9343,
        "lng": 30.3351,
        "social_links": ["https://vk.com/vkteam", "https://habr.com/company/vk"],
    },
    {
        "name": "Сбер",
        "description": "Крупнейший банк России, активно развивающий IT-направление: AI, Big Data, облачные платформы, кибербезопасность.",
        "industry": "Финтех / Банковское дело / AI",
        "website": "https://sber.ru",
        "city": "Москва",
        "lat": 55.7616,
        "lng": 37.6390,
        "social_links": ["https://habr.com/company/sberbank"],
    },
    {
        "name": "Тинькофф",
        "description": "Онлайн-экосистема финансовых и лайфстайл-сервисов. Один из крупнейших IT-работодателей России.",
        "industry": "Финтех / Онлайн-банкинг",
        "website": "https://tinkoff.ru",
        "city": "Москва",
        "lat": 55.7254,
        "lng": 37.6320,
        "social_links": ["https://habr.com/company/tinkoff"],
    },
    {
        "name": "Kaspersky",
        "description": "Международная компания, специализирующаяся на разработке систем защиты от компьютерных вирусов, спама, хакерских атак.",
        "industry": "Кибербезопасность",
        "website": "https://kaspersky.ru",
        "city": "Москва",
        "lat": 55.7900,
        "lng": 37.5795,
        "social_links": ["https://habr.com/company/kaspersky"],
    },
    {
        "name": "JetBrains",
        "description": "Разработчик инструментов для разработчиков: IntelliJ IDEA, PyCharm, WebStorm, Kotlin и другие продукты.",
        "industry": "Инструменты разработки / IDE",
        "website": "https://jetbrains.com",
        "city": "Санкт-Петербург",
        "lat": 59.9580,
        "lng": 30.4065,
        "social_links": ["https://habr.com/company/jetbrains"],
    },
    {
        "name": "Positive Technologies",
        "description": "Лидер рынка результативной кибербезопасности. Разработка продуктов для обнаружения и предотвращения кибератак.",
        "industry": "Кибербезопасность / Информационная безопасность",
        "website": "https://ptsecurity.com",
        "city": "Москва",
        "lat": 55.7695,
        "lng": 37.6502,
        "social_links": ["https://habr.com/company/pt"],
    },
    {
        "name": "Ozon",
        "description": "Одна из крупнейших e-commerce платформ России. Маркетплейс, логистика, финтех-сервисы.",
        "industry": "E-commerce / Маркетплейс",
        "website": "https://ozon.ru",
        "city": "Москва",
        "lat": 55.7100,
        "lng": 37.6156,
        "social_links": ["https://habr.com/company/ozontech"],
    },
    {
        "name": "Avito",
        "description": "Крупнейшая российская платформа объявлений. Высоконагруженные системы, ML, мобильная разработка.",
        "industry": "Классифайды / E-commerce",
        "website": "https://avito.ru",
        "city": "Москва",
        "lat": 55.7520,
        "lng": 37.6175,
        "social_links": ["https://habr.com/company/avito"],
    },
    {
        "name": "1С",
        "description": "Крупнейший разработчик бизнес-приложений в России. ERP, бухгалтерия, управление предприятием.",
        "industry": "Enterprise Software / ERP",
        "website": "https://1c.ru",
        "city": "Москва",
        "lat": 55.7680,
        "lng": 37.6830,
        "social_links": [],
    },
    {
        "name": "Контур",
        "description": "Экосистема облачных сервисов для бизнеса: электронный документооборот, отчётность, бухгалтерия.",
        "industry": "SaaS / B2B / Облачные сервисы",
        "website": "https://kontur.ru",
        "city": "Екатеринбург",
        "lat": 56.8389,
        "lng": 60.6057,
        "social_links": ["https://habr.com/company/skbkontur"],
    },
    {
        "name": "2ГИС",
        "description": "Картографический сервис и справочник организаций. Собственные карты, навигация, геоаналитика.",
        "industry": "Геоинформационные системы / Карты",
        "website": "https://2gis.ru",
        "city": "Новосибирск",
        "lat": 55.0084,
        "lng": 82.9357,
        "social_links": ["https://habr.com/company/2gis"],
    },
]

# Функция для генерации возможностей для каждой компании
def generate_opportunities_for_company(company_name: str, index: int) -> list:
    """Генерирует ~15 возможностей для конкретной компании"""
    
    # Базовые шаблоны возможностей
    internships = [
        {"title": f"Стажёр {role}", "type": OpportunityType.INTERNSHIP, "tags": tags}
        for role, tags in [
            ("Python-разработчик", ["Python", "Django", "SQL", "Intern", "Backend"]),
            ("Frontend-разработчик", ["JavaScript", "React", "Intern", "Frontend"]),
            ("Java-разработчик", ["Java", "Spring", "Intern", "Backend"]),
            ("QA-инженер", ["QA", "Python", "SQL", "Intern"]),
            ("Data Scientist", ["Python", "Machine Learning", "Intern", "Data Science"]),
            ("Go-разработчик", ["Go", "Docker", "Intern", "Backend"]),
            ("iOS-разработчик", ["Swift", "iOS", "Intern", "Mobile"]),
            ("Android-разработчик", ["Kotlin", "Android", "Intern", "Mobile"]),
            ("DevOps-инженер", ["Linux", "Docker", "CI/CD", "Intern", "DevOps"]),
            ("Аналитик данных", ["Python", "SQL", "Data Science", "Intern"]),
            ("UX/UI-дизайнер", ["UX/UI Design", "Intern"]),
            ("Специалист по кибербезопасности", ["Cybersecurity", "Python", "Intern"]),
            ("Backend-разработчик", ["Python", "FastAPI", "PostgreSQL", "Intern", "Backend"]),
            ("Fullstack-разработчик", ["JavaScript", "React", "Node.js", "Intern", "Fullstack"]),
            ("ML-инженер", ["Python", "Machine Learning", "PyTorch", "Intern"]),
        ]
    ]
    
    vacancies = [
        {"title": f"Junior {role}", "type": OpportunityType.VACANCY, "tags": tags}
        for role, tags in [
            ("Python-разработчик", ["Python", "Django", "PostgreSQL", "Docker", "Junior", "Backend"]),
            ("Frontend-разработчик", ["JavaScript", "React", "TypeScript", "Junior", "Frontend"]),
            ("Java-разработчик", ["Java", "Spring", "SQL", "Junior", "Backend"]),
            ("Go-разработчик", ["Go", "Docker", "Kubernetes", "Junior", "Backend"]),
            ("React-разработчик", ["React", "TypeScript", "Junior", "Frontend"]),
            ("Node.js-разработчик", ["Node.js", "JavaScript", "MongoDB", "Junior", "Backend"]),
            ("Data Engineer", ["Python", "SQL", "Airflow", "Junior", "Data Engineering"]),
            ("ML-инженер", ["Python", "Machine Learning", "TensorFlow", "Junior"]),
            ("DevOps-инженер", ["Linux", "Docker", "Kubernetes", "CI/CD", "Junior", "DevOps"]),
            ("Security Analyst", ["Python", "Cybersecurity", "Linux", "Junior"]),
            ("Product Manager", ["Product Management", "Junior"]),
            ("System Administrator", ["Linux", "System Administration", "Junior"]),
        ]
    ]
    
    mentorships = [
        {"title": f"Менторская программа: {topic}", "type": OpportunityType.MENTORSHIP, "tags": tags}
        for topic, tags in [
            ("Backend-разработка на Python", ["Python", "FastAPI", "PostgreSQL", "Backend"]),
            ("Frontend-разработка", ["JavaScript", "React", "TypeScript", "Frontend"]),
            ("Data Science", ["Python", "Machine Learning", "Data Science"]),
            ("DevOps-практики", ["Docker", "Kubernetes", "CI/CD", "DevOps"]),
            ("Мобильная разработка", ["Kotlin", "Swift", "Mobile"]),
            ("Кибербезопасность", ["Cybersecurity", "Linux", "Python"]),
            ("Java-разработка", ["Java", "Spring", "Backend"]),
            ("Go-разработка", ["Go", "Microservices", "Backend"]),
        ]
    ]
    
    events = [
        {"title": f"Хакатон {topic}", "type": OpportunityType.EVENT, "tags": tags, "event_date": date(2026, 4, 15 + index)}
        for topic, tags in [
            ("Code Sprint", ["Python", "JavaScript", "Docker"]),
            ("AI Challenge", ["Machine Learning", "Python", "Data Science"]),
            ("Security CTF", ["Cybersecurity", "Python", "Linux"]),
            ("Mobile App Contest", ["Mobile", "Kotlin", "Swift"]),
            ("DevOps Battle", ["Docker", "Kubernetes", "CI/CD"]),
        ]
    ]
    
    # Комбинируем: 8 стажировок, 5 вакансий, 2 менторства, 2 мероприятия = 17
    opportunities = []
    opportunities.extend(internships[:8])
    opportunities.extend(vacancies[:5])
    opportunities.extend(mentorships[:2])
    opportunities.extend(events[:2])
    
    # Добавляем описания
    for opp in opportunities:
        opp["description"] = f"Отличная возможность начать карьеру в компании {company_name}! Мы ищем талантливых и мотивированных специалистов. Вас ждёт дружный коллектив, современные технологии и интересные задачи."
        opp["work_format"] = WorkFormat.HYBRID if "Стажёр" in opp["title"] else WorkFormat.REMOTE
        opp["salary_min"] = 40000 if opp["type"] == OpportunityType.INTERNSHIP else 70000
        opp["salary_max"] = 60000 if opp["type"] == OpportunityType.INTERNSHIP else 120000
    
    return opportunities

APPLICANTS_DATA = [
    {
        "email": "ivan.petrov@university.ru",
        "display_name": "Иван Петров",
        "first_name": "Иван",
        "last_name": "Петров",
        "patronymic": "Алексеевич",
        "university": "МГТУ им. Н.Э. Баумана",
        "faculty": "Информатика и системы управления",
        "course": 3,
        "graduation_year": 2027,
        "bio": "Студент 3 курса, увлекаюсь бэкенд-разработкой на Python. Участвовал в нескольких хакатонах. Ищу стажировку в крупной IT-компании.",
        "github_url": "https://github.com/ivanpetrov",
        "portfolio_url": "https://ivanpetrov.dev",
        "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "Docker", "Git"],
        "privacy": PrivacyLevel.PUBLIC,
    },
    {
        "email": "anna.sidorova@mail.ru",
        "display_name": "Анна Сидорова",
        "first_name": "Анна",
        "last_name": "Сидорова",
        "patronymic": "Игоревна",
        "university": "НИУ ВШЭ",
        "faculty": "Факультет компьютерных наук",
        "course": 4,
        "graduation_year": 2026,
        "bio": "Фронтенд-разработчик с опытом в React и TypeScript. Пишу pet-проекты, веду блог о веб-разработке.",
        "github_url": "https://github.com/annasidorova",
        "skills": ["JavaScript", "React", "TypeScript", "Next.js", "Git"],
        "privacy": PrivacyLevel.PUBLIC,
    },
    {
        "email": "dmitry.kozlov@student.msu.ru",
        "display_name": "Дмитрий Козлов",
        "first_name": "Дмитрий",
        "last_name": "Козлов",
        "patronymic": "Сергеевич",
        "university": "МГУ им. М.В. Ломоносова",
        "faculty": "Факультет вычислительной математики и кибернетики",
        "course": 2,
        "graduation_year": 2028,
        "bio": "Изучаю Machine Learning и Data Science. Kaggle: серебряная медаль в одном из соревнований.",
        "github_url": "https://github.com/dkozlov",
        "skills": ["Python", "Machine Learning", "Data Science", "Pandas", "PyTorch", "SQL"],
        "privacy": PrivacyLevel.CONTACTS,
    },
    {
        "email": "elena.volkova@gmail.com",
        "display_name": "Елена Волкова",
        "first_name": "Елена",
        "last_name": "Волкова",
        "university": "ИТМО",
        "faculty": "Факультет информационных технологий и программирования",
        "course": None,
        "graduation_year": 2025,
        "bio": "Выпускница ИТМО, ищу первую работу в области QA. Прошла курсы по тестированию, знаю SQL и Python для автотестов.",
        "github_url": "https://github.com/elenavolkova",
        "skills": ["QA", "Python", "SQL", "Git", "Linux"],
        "privacy": PrivacyLevel.PUBLIC,
    },
    {
        "email": "alexey.morozov@yandex.ru",
        "display_name": "Алексей Морозов",
        "first_name": "Алексей",
        "last_name": "Морозов",
        "patronymic": "Дмитриевич",
        "university": "УрФУ",
        "faculty": "Институт радиоэлектроники и информационных технологий",
        "course": 4,
        "graduation_year": 2026,
        "bio": "Full-stack разработчик. Люблю Java и Spring. Участвую в open-source проектах.",
        "github_url": "https://github.com/alexeymorozov",
        "portfolio_url": "https://morozov.dev",
        "skills": ["Java", "Spring", "JavaScript", "React", "PostgreSQL", "Docker", "Fullstack"],
        "privacy": PrivacyLevel.FULL_PUBLIC,
    },
    {
        "email": "maria.kuznetsova@mail.ru",
        "display_name": "Мария Кузнецова",
        "first_name": "Мария",
        "last_name": "Кузнецова",
        "university": "СПбГУ",
        "faculty": "Математико-механический факультет",
        "course": 3,
        "graduation_year": 2027,
        "bio": "Увлекаюсь мобильной разработкой. Написала несколько приложений на Flutter и опубликовала в Google Play.",
        "github_url": "https://github.com/mariakuz",
        "skills": ["Flutter", "Kotlin", "Mobile", "Git"],
        "privacy": PrivacyLevel.CONTACTS,
    },
    {
        "email": "nikita.sokolov@outlook.com",
        "display_name": "Никита Соколов",
        "first_name": "Никита",
        "last_name": "Соколов",
        "university": "НГУ",
        "faculty": "Факультет информационных технологий",
        "course": 2,
        "graduation_year": 2028,
        "bio": "Начинающий DevOps-инженер. Люблю Linux, Docker и автоматизацию. Администрирую сервера для хобби-проектов.",
        "github_url": "https://github.com/nsokolov",
        "skills": ["Linux", "Docker", "Kubernetes", "CI/CD", "Git", "Python", "DevOps"],
        "privacy": PrivacyLevel.PUBLIC,
    },
    {
        "email": "olga.smirnova@student.ru",
        "display_name": "Ольга Смирнова",
        "first_name": "Ольга",
        "last_name": "Смирнова",
        "university": "СПбПУ",
        "faculty": "Институт компьютерных наук и технологий",
        "course": 4,
        "graduation_year": 2026,
        "bio": "Интересуюсь Data Engineering и Big Data. Работала с Spark и Kafka.",
        "github_url": "https://github.com/olgasmirnova",
        "skills": ["Python", "SQL", "Data Engineering", "Spark", "Kafka"],
        "privacy": PrivacyLevel.PUBLIC,
    },
    {
        "email": "pavel.volkov@mail.ru",
        "display_name": "Павел Волков",
        "first_name": "Павел",
        "last_name": "Волков",
        "university": "МИФИ",
        "faculty": "Факультет кибернетики и информационной безопасности",
        "course": 3,
        "graduation_year": 2027,
        "bio": "Увлекаюсь кибербезопасностью и reverse engineering. Участник CTF соревнований.",
        "github_url": "https://github.com/pvolkov",
        "skills": ["Python", "Cybersecurity", "Linux", "C++"],
        "privacy": PrivacyLevel.CONTACTS,
    },
    {
        "email": "ekaterina.nikolaeva@yandex.ru",
        "display_name": "Екатерина Николаева",
        "first_name": "Екатерина",
        "last_name": "Николаева",
        "university": "РЭУ им. Плеханова",
        "faculty": "Бизнес-информатика",
        "course": 4,
        "graduation_year": 2026,
        "bio": "Хочу стать Product Manager в IT. Прошла курсы по управлению продуктами.",
        "skills": ["Product Management", "Agile", "Scrum"],
        "privacy": PrivacyLevel.PUBLIC,
    },
    {
        "email": "andrey.medvedev@gmail.com",
        "display_name": "Андрей Медведев",
        "first_name": "Андрей",
        "last_name": "Медведев",
        "university": "МФТИ",
        "faculty": "Факультет радиотехники и кибернетики",
        "course": 5,
        "graduation_year": 2025,
        "bio": "Выпускник, специализируюсь на Computer Vision и Deep Learning.",
        "github_url": "https://github.com/amedvedev",
        "skills": ["Python", "Computer Vision", "Deep Learning", "PyTorch", "TensorFlow"],
        "privacy": PrivacyLevel.FULL_PUBLIC,
    },
    {
        "email": "tatyana.kozina@student.ru",
        "display_name": "Татьяна Козина",
        "first_name": "Татьяна",
        "last_name": "Козина",
        "university": "СГУ",
        "faculty": "Факультет компьютерных наук",
        "course": 3,
        "graduation_year": 2027,
        "bio": "Интересуюсь UX/UI дизайном и фронтенд-разработкой.",
        "portfolio_url": "https://tkozina.design",
        "skills": ["UX/UI Design", "JavaScript", "React", "Figma"],
        "privacy": PrivacyLevel.PUBLIC,
    },
]


# ============================================================
# ОСНОВНАЯ ФУНКЦИЯ СИДИНГА
# ============================================================

async def seed():
    async with async_session() as db:
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
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            display_name="Администратор",
            role=UserRole.ADMIN,
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
                password_hash=hash_password("demo123"),
                display_name=f"HR {comp_data['name']}",
                role=UserRole.EMPLOYER,
            )
            db.add(employer)
            await db.flush()

            company = Company(
                owner_id=employer.id,
                name=comp_data["name"],
                description=comp_data["description"],
                industry=comp_data["industry"],
                website=comp_data["website"],
                city=comp_data["city"],
                social_links=comp_data.get("social_links", []),
                verification_status=VerificationStatus.VERIFIED,
                verified_by=admin.id,
                verified_at=datetime.now(timezone.utc),
                trust_level=TrustLevel.TRUSTED if i < 6 else TrustLevel.NEW,
                approved_cards_count=10 if i < 6 else 0,
                inn=f"{7700000000 + i}",
            )
            db.add(company)
            companies.append((company, comp_data))

        await db.flush()
        print(f"🏢 Создано {len(COMPANIES_DATA)} компаний с работодателями")

        # === 4. Возможности (по ~15 на каждую компанию) ===
        opp_count = 0
        now = datetime.now(timezone.utc)
        
        for comp_idx, (company, comp_data) in enumerate(companies):
            # Генерируем 15+ возможностей для компании
            company_opps = generate_opportunities_for_company(comp_data["name"], comp_idx)
            
            for opp_idx, opp_data in enumerate(company_opps):
                opportunity = Opportunity(
                    company_id=company.id,
                    title=opp_data["title"],
                    description=opp_data.get("description", f"Возможность в компании {comp_data['name']}"),
                    type=opp_data["type"],
                    work_format=opp_data.get("work_format", WorkFormat.HYBRID),
                    salary_min=opp_data.get("salary_min"),
                    salary_max=opp_data.get("salary_max"),
                    city=comp_data["city"],
                    address=f"г. {comp_data['city']}, офис компании {comp_data['name']}",
                    latitude=comp_data["lat"] + (opp_count % 10) * 0.003,
                    longitude=comp_data["lng"] + (opp_count % 10) * 0.003,
                    status=OpportunityStatus.ACTIVE,
                    moderation_status=ModerationStatus.APPROVED,
                    moderated_by=admin.id,
                    published_at=now - timedelta(days=opp_count % 14),
                    expires_at=date.today() + timedelta(days=45 + opp_count % 30),
                    event_date=opp_data.get("event_date"),
                    contact_email=f"hr@{comp_data['name'].lower().replace(' ', '')}.ru",
                    external_url=comp_data["website"],
                )
                db.add(opportunity)
                await db.flush()
                
                # Привязываем теги
                for tag_name in opp_data.get("tags", []):
                    if tag_name in tag_map:
                        await db.execute(
                            opportunity_tags.insert().values(
                                opportunity_id=opportunity.id,
                                tag_id=tag_map[tag_name].id,
                            )
                        )
                        tag_map[tag_name].usage_count += 1
                
                opp_count += 1
        
        await db.flush()
        print(f"📋 Создано {opp_count} возможностей (в среднем {opp_count // len(COMPANIES_DATA)} на компанию)")

        # === 5. Соискатели ===
        applicants = []
        for app_data in APPLICANTS_DATA:
            applicant_user = User(
                email=app_data["email"],
                password_hash=hash_password("demo123"),
                display_name=app_data["display_name"],
                role=UserRole.APPLICANT,
            )
            db.add(applicant_user)
            await db.flush()

            profile = ApplicantProfile(
                user_id=applicant_user.id,
                first_name=app_data["first_name"],
                last_name=app_data["last_name"],
                patronymic=app_data.get("patronymic"),
                university=app_data.get("university"),
                faculty=app_data.get("faculty"),
                course=app_data.get("course"),
                graduation_year=app_data.get("graduation_year"),
                bio=app_data.get("bio"),
                github_url=app_data.get("github_url"),
                portfolio_url=app_data.get("portfolio_url"),
                privacy_level=app_data.get("privacy", PrivacyLevel.CONTACTS),
                profile_completeness=85,
            )
            db.add(profile)
            await db.flush()

            # Привязываем навыки
            for skill_name in app_data.get("skills", []):
                if skill_name in tag_map:
                    await db.execute(
                        applicant_tags.insert().values(
                            user_id=profile.user_id,
                            tag_id=tag_map[skill_name].id,
                        )
                    )

            applicants.append(applicant_user)

        await db.flush()
        print(f"🎓 Создано {len(APPLICANTS_DATA)} соискателей")

        # === 6. Куратор ===
        curator = User(
            email="curator@tramplin.ru",
            password_hash=hash_password("curator123"),
            display_name="Куратор Платформы",
            role=UserRole.CURATOR,
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
        print(f"   Возможностей:  {opp_count}")
        print(f"   Тегов:         {len(TAGS_DATA)}")
        print(f"\n🔐 Учётные записи для тестирования:")
        print(f"   Админ:         {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        print(f"   Куратор:       curator@tramplin.ru / curator123")
        print(f"   Работодатели:  hr@яндекс.ru / demo123 (и др.)")
        print(f"   Соискатели:    ivan.petrov@university.ru / demo123 (и др.)")
        print(f"\n   Все тестовые пароли: demo123")


if __name__ == "__main__":
    asyncio.run(seed())