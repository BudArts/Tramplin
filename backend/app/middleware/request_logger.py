# backend/app/middleware/request_logger.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Логируем только в debug режиме
        # print(f"{request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)")
        
        response.headers["X-Process-Time"] = str(process_time)
        return response