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

OPPORTUNITIES_DATA = [
    # Стажировки
    {
        "title": "Стажёр Python-разработчик",
        "description": "Мы ищем мотивированного стажёра в команду бэкенд-разработки. Вы будете работать с микросервисной архитектурой, писать код на Python, участвовать в код-ревью и планировании спринтов.\n\nТребования:\n- Знание Python 3.10+\n- Понимание основ SQL\n- Базовые знания Git\n- Желание учиться\n\nМы предлагаем:\n- Менторство от senior-разработчиков\n- Гибкий график\n- Возможность перехода в штат",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 40000,
        "salary_max": 60000,
        "tags": ["Python", "Django", "SQL", "Git", "Intern", "Backend"],
    },
    {
        "title": "Стажёр Frontend-разработчик (React)",
        "description": "Приглашаем стажёра в команду фронтенд-разработки. Вы будете создавать пользовательские интерфейсы для наших продуктов, работать с современным стеком технологий.\n\nТребования:\n- HTML, CSS, JavaScript\n- Базовые знания React\n- Понимание адаптивной вёрстки\n\nБудет плюсом:\n- TypeScript\n- Опыт работы с REST API",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.HYBRID,
        "salary_min": 35000,
        "salary_max": 55000,
        "tags": ["JavaScript", "React", "TypeScript", "Intern", "Frontend"],
    },
    {
        "title": "Стажёр QA Engineer",
        "description": "Ищем стажёра в команду тестирования. Вы освоите ручное и автоматизированное тестирование, научитесь писать тест-кейсы и работать с CI/CD.\n\nТребования:\n- Понимание процесса тестирования\n- Базовые знания SQL\n- Аналитический склад ума",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 30000,
        "salary_max": 50000,
        "tags": ["QA", "SQL", "Python", "Git", "Intern"],
    },
    {
        "title": "Стажёр Data Science",
        "description": "Стажировка в отделе аналитики данных. Работа с реальными датасетами, построение ML-моделей, визуализация данных.\n\nТребования:\n- Python (NumPy, Pandas)\n- Основы статистики и линейной алгебры\n- Базовые знания ML",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.REMOTE,
        "salary_min": 45000,
        "salary_max": 65000,
        "tags": ["Python", "Data Science", "Machine Learning", "Pandas", "Intern"],
    },
    {
        "title": "Стажёр мобильный разработчик (Android)",
        "description": "Приглашаем стажёра в команду мобильной разработки. Kotlin, Jetpack Compose, работа с API.\n\nТребования:\n- Kotlin или Java\n- Понимание основ Android SDK\n- Знание паттернов проектирования (MVP/MVVM)",
        "type": OpportunityType.INTERNSHIP,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 40000,
        "salary_max": 60000,
        "tags": ["Kotlin", "Mobile", "Git", "Intern"],
    },
    # Вакансии
    {
        "title": "Junior Backend Developer (Python/FastAPI)",
        "description": "Ищем Junior Backend разработчика в команду развития платформы. Вы будете проектировать и реализовывать REST API, работать с PostgreSQL, участвовать в архитектурных решениях.\n\nТребования:\n- Python 3.10+ (уверенное владение)\n- FastAPI или Django REST Framework\n- PostgreSQL, SQLAlchemy\n- Docker, Git\n\nМы предлагаем:\n- ЗП от 80 000 до 130 000 ₽\n- ДМС после испытательного срока\n- Обучение за счёт компании\n- Удалённая работа",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.REMOTE,
        "salary_min": 80000,
        "salary_max": 130000,
        "tags": ["Python", "FastAPI", "PostgreSQL", "Docker", "Junior", "Backend"],
    },
    {
        "title": "Junior Frontend Developer (React/TypeScript)",
        "description": "Приглашаем Junior Frontend разработчика. Современный стек, интересные задачи, дружная команда.\n\nТребования:\n- React 18+\n- TypeScript\n- CSS-in-JS или Tailwind\n- Работа с REST API\n\nБудет плюсом:\n- Next.js\n- Опыт с state management (Zustand, Redux)",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.HYBRID,
        "salary_min": 70000,
        "salary_max": 120000,
        "tags": ["JavaScript", "React", "TypeScript", "Junior", "Frontend"],
    },
    {
        "title": "Junior Java Developer",
        "description": "Ищем начинающего Java-разработчика в enterprise-команду. Spring Boot, микросервисы, Kafka.\n\nТребования:\n- Java 17+\n- Spring Framework\n- SQL, JPA/Hibernate\n- Понимание микросервисной архитектуры",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 90000,
        "salary_max": 140000,
        "tags": ["Java", "Spring", "SQL", "Docker", "Junior", "Backend"],
    },
    {
        "title": "Junior DevOps Engineer",
        "description": "Приглашаем Junior DevOps в команду инфраструктуры. CI/CD, контейнеризация, мониторинг.\n\nТребования:\n- Linux (уверенный пользователь)\n- Docker, docker-compose\n- Базовые знания CI/CD (GitLab CI / GitHub Actions)\n- Bash-скриптинг",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.REMOTE,
        "salary_min": 85000,
        "salary_max": 130000,
        "tags": ["Linux", "Docker", "Kubernetes", "CI/CD", "Git", "Junior", "DevOps"],
    },
    {
        "title": "Junior Fullstack Developer (Node.js + React)",
        "description": "Ищем Fullstack-разработчика для работы над внутренними инструментами компании.\n\nТребования:\n- Node.js / Express.js\n- React + TypeScript\n- PostgreSQL или MongoDB\n- REST API",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.HYBRID,
        "salary_min": 75000,
        "salary_max": 125000,
        "tags": ["JavaScript", "Node.js", "React", "TypeScript", "PostgreSQL", "Junior", "Fullstack"],
    },
    {
        "title": "Junior C# Developer (.NET)",
        "description": "Разработка корпоративных приложений на платформе .NET. ASP.NET Core, Entity Framework, Azure.\n\nТребования:\n- C# (.NET 6+)\n- ASP.NET Core\n- SQL Server / PostgreSQL\n- Понимание ООП и SOLID",
        "type": OpportunityType.VACANCY,
        "work_format": WorkFormat.OFFICE,
        "salary_min": 80000,
        "salary_max": 130000,
        "tags": ["C#", ".NET", "SQL", "Junior", "Backend"],
    },
    # Менторские программы
    {
        "title": "Менторская программа по Data Science",
        "description": "12-недельная менторская программа для начинающих специалистов в области Data Science. Персональный ментор, еженедельные созвоны, реальные проекты.\n\nПрограмма включает:\n- Основы ML и статистики\n- Работа с реальными данными\n- Подготовка портфолио\n- Помощь в трудоустройстве\n\nФормат: онлайн, 2 созвона в неделю по 1 часу",
        "type": OpportunityType.MENTORSHIP,
        "work_format": WorkFormat.REMOTE,
        "salary_min": None,
        "salary_max": None,
        "tags": ["Python", "Machine Learning", "Data Science", "Pandas"],
    },
    {
        "title": "Менторство: путь в Backend-разработку",
        "description": "Индивидуальная менторская программа для тех, кто хочет стать Backend-разработчиком. 8 недель, от основ до первого проекта.\n\nТемы:\n- Python и алгоритмы\n- Базы данных и SQL\n- REST API (FastAPI/Django)\n- Docker и деплой\n- Подготовка к собеседованиям",
        "type": OpportunityType.MENTORSHIP,
        "work_format": WorkFormat.REMOTE,
        "salary_min": None,
        "salary_max": None,
        "tags": ["Python", "FastAPI", "Django", "PostgreSQL", "Docker", "Backend"],
    },
    {
        "title": "Менторство по фронтенд-разработке",
        "description": "Персональное менторство для начинающих фронтенд-разработчиков. Современный стек, реальные проекты, код-ревью.\n\n10 недель интенсива:\n- HTML/CSS продвинутый\n- JavaScript ES6+\n- React + TypeScript\n- Сборка проекта для портфолио",
        "type": OpportunityType.MENTORSHIP,
        "work_format": WorkFormat.REMOTE,
        "salary_min": None,
        "salary_max": None,
        "tags": ["JavaScript", "React", "TypeScript", "Frontend"],
    },
    # Мероприятия
    {
        "title": "Хакатон «Code Sprint 2026»",
        "description": "48-часовой хакатон для студентов и начинающих разработчиков! Формируйте команды, решайте реальные кейсы от компаний-партнёров.\n\nПризовой фонд: 500 000 ₽\n\nНаправления:\n- Web-разработка\n- Data Science & AI\n- Mobile\n- DevOps\n\nДата: 15-17 апреля 2026\nМесто: Технопарк «Сколково»\n\nРегистрация до 10 апреля.",
        "type": OpportunityType.EVENT,
        "work_format": WorkFormat.OFFICE,
        "salary_min": None,
        "salary_max": None,
        "tags": ["Python", "JavaScript", "Docker", "Machine Learning"],
        "event_date": date(2026, 4, 15),
    },
    {
        "title": "День открытых дверей: карьера в IT",
        "description": "Приглашаем студентов на День открытых дверей! Вы узнаете о стажировках и вакансиях, пообщаетесь с разработчиками и HR.\n\nПрограмма:\n- 10:00 — Презентация компании\n- 11:00 — Технические доклады\n- 13:00 — Нетворкинг и кофе\n- 14:00 — Экскурсия по офису\n\nВход свободный, регистрация обязательна.",
        "type": OpportunityType.EVENT,
        "work_format": WorkFormat.OFFICE,
        "salary_min": None,
        "salary_max": None,
        "tags": [],
        "event_date": date(2026, 4, 20),
    },
    {
        "title": "Онлайн-лекция: Микросервисы на Go",
        "description": "Открытая лекция от Senior-разработчика о проектировании микросервисов на Go.\n\nТемы:\n- Почему Go для микросервисов\n- gRPC vs REST\n- Паттерны отказоустойчивости\n- Live-coding демо\n\nДата: 25 апреля 2026, 19:00 МСК\nПлатформа: Zoom\n\nЗаписи будут доступны участникам.",
        "type": OpportunityType.EVENT,
        "work_format": WorkFormat.REMOTE,
        "salary_min": None,
        "salary_max": None,
        "tags": ["Go", "Docker", "Kubernetes", "Backend"],
        "event_date": date(2026, 4, 25),
    },
    {
        "title": "Воркшоп: CI/CD с нуля",
        "description": "Практический воркшоп по настройке CI/CD пайплайнов. GitHub Actions, Docker, автоматический деплой.\n\nВы научитесь:\n- Настраивать GitHub Actions\n- Собирать Docker-образы\n- Деплоить на VPS\n- Настраивать мониторинг\n\nНужен ноутбук с Docker.\nДата: 5 мая 2026, 11:00-17:00",
        "type": OpportunityType.EVENT,
        "work_format": WorkFormat.OFFICE,
        "salary_min": None,
        "salary_max": None,
        "tags": ["Docker", "CI/CD", "Git", "Linux", "DevOps"],
        "event_date": date(2026, 5, 5),
    },
]

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

        # === 4. Возможности ===
        opp_count = 0
        now = datetime.now(timezone.utc)

        for comp_idx, (company, comp_data) in enumerate(companies):
            # Каждая компания получает 3-4 возможности
            start = (comp_idx * 2) % len(OPPORTUNITIES_DATA)
            company_opps = OPPORTUNITIES_DATA[start:start + 3]

            # Добавляем ещё одну случайную если мало
            if len(company_opps) < 3:
                company_opps += OPPORTUNITIES_DATA[:3 - len(company_opps)]

            for opp_data in company_opps:
                opportunity = Opportunity(
                    company_id=company.id,
                    title=opp_data["title"],
                    description=opp_data["description"],
                    type=opp_data["type"],
                    work_format=opp_data["work_format"],
                    salary_min=opp_data["salary_min"],
                    salary_max=opp_data["salary_max"],
                    city=comp_data["city"],
                    address=f"г. {comp_data['city']}, офис компании {comp_data['name']}",
                    latitude=comp_data["lat"] + (opp_count % 5) * 0.005,
                    longitude=comp_data["lng"] + (opp_count % 5) * 0.005,
                    status=OpportunityStatus.ACTIVE,
                    moderation_status=ModerationStatus.APPROVED,
                    moderated_by=admin.id,
                    published_at=now - timedelta(days=opp_count % 14),
                    expires_at=date.today() + timedelta(days=30 + opp_count * 3),
                    event_date=opp_data.get("event_date"),
                    contact_email=f"hr@{comp_data['name'].lower().replace(' ', '')}.ru",
                    external_url=comp_data["website"],
                )
                db.add(opportunity)
                await db.flush()

                # Привязываем теги
                # Привязываем теги через ассоциативную таблицу
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
        print(f"📋 Создано {opp_count} возможностей")

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
            # Привязываем навыки через ассоциативную таблицу
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