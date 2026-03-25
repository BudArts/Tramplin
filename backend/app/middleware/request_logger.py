# backend/app/middleware/request_logger.py
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json

logger = logging.getLogger(__name__)

class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Логируем входящий запрос
        body = await request.body()
        
        logger.info(f"=== INCOMING REQUEST ===")
        logger.info(f"Method: {request.method}")
        logger.info(f"URL: {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        
        if body:
            try:
                body_str = body.decode('utf-8')
                logger.info(f"Body: {body_str}")
            except:
                logger.info(f"Body: <binary>")
        
        # Получаем ответ
        response = await call_next(request)
        
        logger.info(f"Response status: {response.status_code}")
        logger.info("========================")
        
        return response