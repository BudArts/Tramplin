from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from app.utils.logger import logger


async def http_exception_handler(request: Request, exc: HTTPException):
    """Стандартизированный ответ для HTTPException."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Красивые ошибки валидации."""
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })

    logger.warning(
        f"Validation error on {request.method} {request.url.path}: {errors}"
    )

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Ошибка валидации данных",
            "errors": errors,
        },
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Ошибки уникальности и FK."""
    logger.error(f"IntegrityError on {request.method} {request.url.path}: {exc}")

    return JSONResponse(
        status_code=409,
        content={
            "detail": "Конфликт данных. Запись уже существует или нарушена целостность.",
        },
    )


async def database_error_handler(request: Request, exc: OperationalError):
    """Ошибки подключения к БД."""
    logger.critical(f"Database error: {exc}")

    return JSONResponse(
        status_code=503,
        content={
            "detail": "Сервис временно недоступен. Попробуйте позже.",
        },
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Непредвиденные ошибки."""
    logger.critical(
        f"Unhandled exception on {request.method} {request.url.path}: "
        f"{exc.__class__.__name__}: {exc}",
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Внутренняя ошибка сервера",
        },
    )