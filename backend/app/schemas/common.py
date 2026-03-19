from pydantic import BaseModel


class PaginatedResponse(BaseModel):
    """Базовая обёртка для пагинированных ответов."""
    total: int
    page: int
    per_page: int
    pages: int


class MessageResponse(BaseModel):
    """Простой текстовый ответ."""
    message: str


class ErrorResponse(BaseModel):
    """Ответ с ошибкой."""
    detail: str