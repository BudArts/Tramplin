# backend/app/routers/company_registration.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.user import User
from app.schemas.company import CompanyRegisterRequest, CompanyEmailVerificationRequest
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

        # Проверка паролей
        if data.user_password != data.user_password_confirm:
            logger.error("❌ Пароли не совпадают")
            raise ValueError("Пароли не совпадают")

        # Регистрация компании
        logger.info("🚀 Вызов company_service.register_company...")
        company, user, email_sent = await company_service.register_company(db, data)
        
        logger.info("=" * 50)
        logger.info(f"✅ КОМПАНИЯ УСПЕШНО ЗАРЕГИСТРИРОВАНА!")
        logger.info(f"   ID компании: {company.id}")
        logger.info(f"   ID пользователя: {user.id}")
        logger.info(f"   company_id пользователя: {user.company_id}")
        logger.info(f"   Email отправлен: {email_sent}")
        logger.info("=" * 50)

        return MessageResponse(
            message="Заявка на регистрация принята! Проверьте корпоративную почту для подтверждения.",
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


# ✅ GET-эндпоинт для клика по ссылке из письма
@router.get(
    "/verify-email",
    summary="Подтверждение email по ссылке из письма",
    response_class=HTMLResponse
)
async def verify_company_email_link(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    GET-эндпоинт для подтверждения корпоративной почты.
    Пользователь кликает по ссылке из письма → получает HTML-страницу с результатом.
    """
    from app.services.company_service import company_service
    from app.config import settings

    logger.info("=" * 60)
    logger.info("📧 GET-ЗАПРОС НА ВЕРИФИКАЦИЮ EMAIL")
    logger.info(f"   Токен: {token[:30]}...")
    logger.info("=" * 60)

    try:
        company = await company_service.verify_company_email(db, token)

        logger.info(f"✅ Верификация успешна!")
        logger.info(f"   company.id: {company.id}")
        logger.info(f"   company.status: {company.status.value if hasattr(company.status, 'value') else company.status}")
        logger.info(f"   company.is_email_verified: {company.is_email_verified}")

        html_content = f"""
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email подтверждён — {settings.APP_NAME}</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    padding: 50px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 600px;
                    width: 100%;
                    animation: slideIn 0.6s ease-out;
                }}
                @keyframes slideIn {{
                    from {{ opacity: 0; transform: translateY(-30px); }}
                    to {{ opacity: 1; transform: translateY(0); }}
                }}
                .success-icon {{
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 30px;
                    box-shadow: 0 10px 30px rgba(76, 175, 80, 0.3);
                    animation: pulse 2s infinite;
                }}
                @keyframes pulse {{
                    0%, 100% {{ transform: scale(1); }}
                    50% {{ transform: scale(1.05); }}
                }}
                .checkmark {{
                    color: white;
                    font-size: 50px;
                    font-weight: bold;
                }}
                h1 {{
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 32px;
                    font-weight: 700;
                }}
                .company-name {{
                    color: #667eea;
                    font-size: 24px;
                    font-weight: 600;
                    margin-bottom: 20px;
                }}
                p {{
                    color: #555;
                    line-height: 1.8;
                    margin-bottom: 15px;
                    font-size: 16px;
                }}
                .info-box {{
                    background: linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%);
                    border-left: 5px solid #2196F3;
                    padding: 20px;
                    margin: 30px 0;
                    text-align: left;
                    border-radius: 8px;
                }}
                .info-box strong {{
                    color: #1976d2;
                    display: block;
                    margin-bottom: 10px;
                    font-size: 18px;
                }}
                .info-box ol {{
                    margin: 10px 0 0 20px;
                    color: #555;
                }}
                .info-box li {{
                    margin: 8px 0;
                }}
                .btn {{
                    display: inline-block;
                    margin-top: 30px;
                    padding: 16px 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                }}
                .btn:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #999;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">
                    <div class="checkmark">✓</div>
                </div>
                <h1>Email успешно подтверждён!</h1>
                <div class="company-name">{company.display_name}</div>
                <p>Корпоративная почта вашей компании подтверждена.</p>
                
                <div class="info-box">
                    <strong>📋 Следующие шаги:</strong>
                    <ol>
                        <li><strong>Модерация</strong> — Ваша заявка направлена на проверку</li>
                        <li><strong>Уведомление</strong> — Мы отправим результат в течение 24 часов</li>
                        <li><strong>Доступ</strong> — После одобрения вы сможете публиковать вакансии</li>
                    </ol>
                </div>
                
                <p style="margin-top: 20px;">
                    Пока идёт проверка, вы можете войти в личный кабинет и подготовить информацию о компании.
                </p>
                
                <a href="{settings.FRONTEND_URL}/company/login" class="btn">
                    🔐 Войти в личный кабинет
                </a>
                
                <div class="footer">
                    <p>© 2024 {settings.APP_NAME}. Все права защищены.</p>
                    <p style="margin-top: 10px;">
                        Если у вас возникли вопросы, свяжитесь с поддержкой: 
                        <a href="mailto:support@tramplin.ru" style="color: #667eea;">support@tramplin.ru</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content, status_code=200)

    except ValueError as e:
        logger.error(f"❌ Ошибка верификации: {str(e)}")
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ошибка верификации — {settings.APP_NAME}</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    padding: 50px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 600px;
                    width: 100%;
                }}
                .error-icon {{
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #f44336, #d32f2f);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 30px;
                    box-shadow: 0 10px 30px rgba(244, 67, 54, 0.3);
                }}
                .cross {{
                    color: white;
                    font-size: 50px;
                    font-weight: bold;
                }}
                h1 {{
                    color: #d32f2f;
                    margin-bottom: 20px;
                    font-size: 32px;
                }}
                p {{
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 15px;
                    font-size: 16px;
                }}
                .error-message {{
                    background: #ffebee;
                    border-left: 4px solid #f44336;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: left;
                    border-radius: 4px;
                    color: #c62828;
                }}
                ul {{
                    text-align: left;
                    color: #777;
                    margin: 20px 0 20px 40px;
                }}
                li {{
                    margin: 10px 0;
                }}
                .btn {{
                    display: inline-block;
                    margin-top: 30px;
                    padding: 16px 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 600;
                    transition: all 0.3s;
                }}
                .btn:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">
                    <div class="cross">✕</div>
                </div>
                <h1>Ошибка верификации</h1>
                
                <div class="error-message">
                    <strong>⚠️ {str(e)}</strong>
                </div>
                
                <p><strong>Возможные причины:</strong></p>
                <ul>
                    <li>Ссылка устарела (действительна 24 часа)</li>
                    <li>Email уже был подтверждён ранее</li>
                    <li>Неверная или повреждённая ссылка</li>
                </ul>
                
                <p style="margin-top: 20px;">
                    Если проблема сохраняется, свяжитесь с технической поддержкой.
                </p>
                
                <a href="{settings.FRONTEND_URL}" class="btn">
                    🏠 На главную страницу
                </a>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content, status_code=400)


# POST-эндпоинт (для API, если нужен)
@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Подтверждение корпоративной почты (API)"
)
async def verify_company_email_post(
    data: CompanyEmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """POST-эндпоинт для подтверждения email через API."""
    from app.services.company_service import company_service

    logger.info(f"📧 POST-верификация, токен: {data.token[:30]}...")

    try:
        company = await company_service.verify_company_email(db, data.token)

        return MessageResponse(
            message="Корпоративная почта подтверждена! Ваша заявка направлена на модерацию.",
            success=True,
            data={
                "company_id": company.id,
                "status": company.status.value if hasattr(company.status, 'value') else str(company.status),
                "is_email_verified": company.is_email_verified
            }
        )

    except ValueError as e:
        logger.error(f"❌ Ошибка: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Вспомогательные функции
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