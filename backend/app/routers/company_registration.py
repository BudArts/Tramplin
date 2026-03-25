# backend/app/routers/company_registration.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging
logger = logging.getLogger(__name__)
from app.database import get_db
from app.models.user import User
from app.schemas.company import CompanyRegisterRequest, CompanyEmailVerificationRequest, CompanyRegisterStep2
from app.schemas.auth import MessageResponse

router = APIRouter(prefix="/companies/auth", tags=["Company Registration"]) 


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация компании"
)
async def register_company(
    data: CompanyRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Регистрация компании на платформе."""
    from app.services.company_service import company_service
    
    logger.info("=" * 50)
    logger.info("📝 ПОЛУЧЕН ЗАПРОС НА РЕГИСТРАЦИЮ КОМПАНИИ")
    logger.info(f"   Название: {data.company_name}")
    logger.info(f"   ИНН: {data.inn}")
    logger.info(f"   Email компании: {data.email}")
    logger.info(f"   Email контактного лица: {data.user_email}")
    logger.info(f"   Телефон: {data.phone}")
    logger.info(f"   Имя контактного лица: {data.user_first_name} {data.user_last_name}")
    logger.info("=" * 50)

    try:
        # Валидация ИНН по контрольной сумме
        logger.info("🔍 Проверка ИНН...")
        if not _validate_inn_checksum(data.inn):
            logger.error(f"❌ Неверный ИНН: {data.inn}")
            raise ValueError("Неверный формат ИНН (ошибка контрольной суммы)")
        logger.info("✅ ИНН прошел проверку")

        # Проверка уникальности ИНН
        logger.info("🔍 Проверка уникальности ИНН...")
        existing_company = await company_service.get_company_by_inn(db, data.inn)
        if existing_company:
            logger.error(f"❌ Компания с ИНН {data.inn} уже существует")
            raise ValueError("Компания с таким ИНН уже зарегистрирована")
        logger.info("✅ ИНН уникален")

        # Проверка email пользователя
        logger.info("🔍 Проверка email контактного лица...")
        result = await db.execute(select(User).where(User.email == data.user_email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            logger.error(f"❌ Пользователь с email {data.user_email} уже существует")
            raise ValueError("Пользователь с таким email уже зарегистрирован")
        logger.info("✅ Email контактного лица уникален")

        # Проверка email компании
        logger.info("🔍 Проверка корпоративного email...")
        existing_company_by_email = await company_service.get_company_by_email(db, data.email)
        if existing_company_by_email:
            logger.error(f"❌ Компания с email {data.email} уже существует")
            raise ValueError("Компания с такой корпоративной почтой уже зарегистрирована")
        
        # Проверка корпоративного email
        if not _is_corporate_email(data.email):
            logger.error(f"❌ Email {data.email} не является корпоративным")
            raise ValueError(
                "Используйте корпоративную почту (например, @company.ru). "
                "Бесплатные почтовые сервисы не принимаются."
            )
        logger.info("✅ Корпоративный email прошел проверку")

        # Подготовка данных для регистрации
        logger.info("🔍 Подготовка данных для регистрации...")
        step2_data = CompanyRegisterStep2(
            inn=data.inn,
            ogrn=None,
            kpp=None,
            company_name=data.company_name,
            email=data.email,
            phone=data.phone,
            website=None,
            description=None,
            employees_count=None,
            user_first_name=data.user_first_name,
            user_last_name=data.user_last_name,
            user_patronymic=data.user_patronymic,
            user_email=data.user_email,
            user_password=data.user_password,
            user_password_confirm=data.user_password_confirm
        )

        # Регистрация компании
        logger.info("🚀 Вызов company_service.register_company...")
        company, user, email_sent = await company_service.register_company(db, step2_data)
        
        logger.info("=" * 50)
        logger.info(f"✅ КОМПАНИЯ УСПЕШНО ЗАРЕГИСТРИРОВАНА!")
        logger.info(f"   ID компании: {company.id}")
        logger.info(f"   ID пользователя: {user.id}")
        logger.info(f"   Email отправлен: {email_sent}")
        logger.info("=" * 50)

        return MessageResponse(
            message="Заявка на регистрацию принята! Проверьте корпоративную почту для подтверждения.",
            success=True,
            data={
                "company_id": company.id,
                "user_id": user.id,
                "email_sent": email_sent
            }
        )

    except ValueError as e:
        logger.error(f"❌ Ошибка валидации: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Подтверждение корпоративной почты"
)
async def verify_company_email(
    data: CompanyEmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Подтверждение корпоративной почты компании."""
    from app.services.company_service import company_service

    try:
        company = await company_service.verify_company_email(db, data.token)

        return MessageResponse(
            message="Корпоративная почта подтверждена! Ваша заявка направлена на модерацию.",
            success=True,
            data={"company_id": company.id}
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


def _validate_inn_checksum(inn: str) -> bool:
    """Валидация ИНН по контрольной сумме"""
    if len(inn) == 10:
        coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8]
        checksum = sum(int(inn[i]) * coefficients[i] for i in range(9)) % 11 % 10
        return checksum == int(inn[9])

    if len(inn) == 12:
        coef1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        coef2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]

        check1 = sum(int(inn[i]) * coef1[i] for i in range(10)) % 11 % 10
        check2 = sum(int(inn[i]) * coef2[i] for i in range(11)) % 11 % 10

        return check1 == int(inn[10]) and check2 == int(inn[11])

    return False


def _is_corporate_email(email: str) -> bool:
    """Проверка, что email корпоративный"""
    free_domains = [
        'gmail.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru',
        'rambler.ru', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
        'protonmail.com', 'icloud.com', 'me.com', 'live.com', 'mail.com',
        'gmx.com', 'gmx.de', 'web.de', 't-online.de', 'orange.fr',
        'free.fr', 'laposte.net', 'libero.it', 'virgilio.it',
        'interia.pl', 'o2.pl', 'seznam.cz', 'email.cz', 'centrum.cz',
        'post.cz', 'wp.pl', 'onet.pl', 'poczta.onet.pl', 'op.pl'
    ]
    domain = email.split('@')[-1].lower()
    return domain not in free_domains