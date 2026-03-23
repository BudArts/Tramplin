# backend/app/schemas/common.py
from pydantic import BaseModel
from typing import List, Any, Optional


class PaginatedResponse(BaseModel):
    """Стандартный ответ с пагинацией"""
    items: List[Any]
    total: int
    skip: int
    limit: int

    @property
    def pages(self) -> int:
        if self.limit == 0:
            return 0
        return (self.total + self.limit - 1) // self.limit

    @property
    def page(self) -> int:
        if self.limit == 0:
            return 1
        return (self.skip // self.limit) + 1

    @property
    def has_next(self) -> bool:
        return self.skip + self.limit < self.total

    @property
    def has_prev(self) -> bool:
        return self.skip > 0


class ErrorResponse(BaseModel):
    """Стандартный ответ с ошибкой"""
    detail: str
    code: Optional[str] = None
    field: Optional[str] = None


class MessageResponse(BaseModel):
    """Стандартный ответ с сообщением"""
    message: str
    success: bool = True
    data: Optional[Any] = None