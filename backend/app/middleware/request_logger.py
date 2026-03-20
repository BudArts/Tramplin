import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.logger import logger


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Добавляем request_id в state
        request.state.request_id = request_id

        # Логируем запрос
        logger.info(
            f"[{request_id}] → {request.method} {request.url.path} "
            f"| Client: {request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            duration = time.time() - start_time
            logger.error(
                f"[{request_id}] ✗ {request.method} {request.url.path} "
                f"| Error: {exc.__class__.__name__}: {exc} "
                f"| {duration:.3f}s"
            )
            raise

        duration = time.time() - start_time

        # Цвет по статусу
        status = response.status_code
        if status < 400:
            logger.info(
                f"[{request_id}] ← {status} {request.method} {request.url.path} | {duration:.3f}s"
            )
        elif status < 500:
            logger.warning(
                f"[{request_id}] ← {status} {request.method} {request.url.path} | {duration:.3f}s"
            )
        else:
            logger.error(
                f"[{request_id}] ← {status} {request.method} {request.url.path} | {duration:.3f}s"
            )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration:.3f}"

        return response