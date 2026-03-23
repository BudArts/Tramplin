# backend/app/services/email_service.py
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailConfig:
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )


class EmailService:
    def __init__(self):
        self.fastmail = FastMail(EmailConfig.conf)
    
    async def send_email(
        self,
        email_to: EmailStr,
        subject: str,
        body: str,
        subtype: MessageType = MessageType.html
    ) -> bool:
        """Отправка email"""
        try:
            message = MessageSchema(
                subject=subject,
                recipients=[email_to],
                body=body,
                subtype=subtype
            )
            await self.fastmail.send_message(message)
            logger.info(f"Email sent successfully to {email_to}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {email_to}: {e}")
            return False
    
    async def send_verification_email(
        self,
        email_to: EmailStr,
        first_name: str,
        verification_token: str
    ) -> bool:
        """Отправка email для подтверждения адреса"""
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        
        subject = f"Подтвердите email для {settings.APP_NAME}"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .button:hover {{ background: #5a6fd6; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{settings.APP_NAME}</h1>
                </div>
                <div class="content">
                    <h2>Здравствуйте, {first_name}!</h2>
                    <p>Спасибо за регистрацию на платформе {settings.APP_NAME}.</p>
                    <p>Для завершения регистрации и активации аккаунта, пожалуйста, подтвердите ваш email:</p>
                    <p style="text-align: center;">
                        <a href="{verification_link}" class="button">Подтвердить email</a>
                    </p>
                    <p>Или скопируйте ссылку в браузер:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                        {verification_link}
                    </p>
                    <p><strong>Ссылка действительна {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} часов.</strong></p>
                    <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
                </div>
                <div class="footer">
                    <p>© {settings.APP_NAME}. Все права защищены.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(email_to, subject, body)
    
    async def send_company_verification_email(
        self,
        email_to: EmailStr,
        company_name: str,
        verification_token: str
    ) -> bool:
        """Отправка email для подтверждения корпоративной почты компании"""
        verification_link = f"{settings.FRONTEND_URL}/verify-company?token={verification_token}"
        
        subject = f"Подтвердите регистрацию компании на {settings.APP_NAME}"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .info-box {{ background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Регистрация компании</h1>
                </div>
                <div class="content">
                    <h2>Подтверждение корпоративной почты</h2>
                    <div class="info-box">
                        <strong>Компания:</strong> {company_name}
                    </div>
                    <p>Для завершения регистрации компании на платформе {settings.APP_NAME}, 
                       подтвердите, что данный email принадлежит вашей организации:</p>
                    <p style="text-align: center;">
                        <a href="{verification_link}" class="button">Подтвердить и активировать</a>
                    </p>
                    <p>Или скопируйте ссылку в браузер:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                        {verification_link}
                    </p>
                    <p><strong>Ссылка действительна {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} часов.</strong></p>
                    <p>После подтверждения email ваша заявка будет направлена на модерацию.</p>
                    <hr>
                    <p style="color: #888; font-size: 12px;">
                        Если вы не подавали заявку на регистрацию компании, пожалуйста, 
                        проигнорируйте это письмо или свяжитесь с нашей поддержкой.
                    </p>
                </div>
                <div class="footer">
                    <p>© {settings.APP_NAME}. Все права защищены.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(email_to, subject, body)
    
    async def send_password_reset_email(
        self,
        email_to: EmailStr,
        first_name: str,
        reset_token: str
    ) -> bool:
        """Отправка email для сброса пароля"""
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        subject = f"Сброс пароля на {settings.APP_NAME}"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Сброс пароля</h1>
                </div>
                <div class="content">
                    <h2>Здравствуйте, {first_name}!</h2>
                    <p>Вы запросили сброс пароля для вашего аккаунта на {settings.APP_NAME}.</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Сбросить пароль</a>
                    </p>
                    <div class="warning">
                        <strong>⚠️ Внимание:</strong> Ссылка действительна 1 час.
                    </div>
                    <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо. 
                       Ваш пароль останется прежним.</p>
                </div>
                <div class="footer">
                    <p>© {settings.APP_NAME}. Все права защищены.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(email_to, subject, body)
    
    async def send_company_approved_email(
        self,
        email_to: EmailStr,
        company_name: str
    ) -> bool:
        """Уведомление об одобрении компании"""
        subject = f"Ваша компания одобрена на {settings.APP_NAME}"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body>
            <h2>Поздравляем!</h2>
            <p>Ваша компания <strong>{company_name}</strong> успешно прошла модерацию 
               и активирована на платформе {settings.APP_NAME}.</p>
            <p>Теперь вы можете:</p>
            <ul>
                <li>Публиковать стажировки и вакансии</li>
                <li>Просматривать резюме кандидатов</li>
                <li>Связываться со студентами</li>
            </ul>
            <p><a href="{settings.FRONTEND_URL}/company/dashboard">Перейти в личный кабинет</a></p>
        </body>
        </html>
        """
        
        return await self.send_email(email_to, subject, body)
    
    async def send_company_rejected_email(
        self,
        email_to: EmailStr,
        company_name: str,
        reason: str
    ) -> bool:
        """Уведомление об отклонении компании"""
        subject = f"Заявка компании отклонена на {settings.APP_NAME}"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body>
            <h2>Заявка отклонена</h2>
            <p>К сожалению, заявка на регистрацию компании <strong>{company_name}</strong> 
               была отклонена.</p>
            <p><strong>Причина:</strong> {reason}</p>
            <p>Если вы считаете, что произошла ошибка, пожалуйста, свяжитесь с нашей поддержкой.</p>
        </body>
        </html>
        """
        
        return await self.send_email(email_to, subject, body)


# Singleton
email_service = EmailService()