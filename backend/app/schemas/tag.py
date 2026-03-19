from pydantic import BaseModel, Field
from app.models.tag import TagCategory


class TagResponse(BaseModel):
    id: int
    name: str
    category: TagCategory
    is_approved: bool
    usage_count: int

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: TagCategory = TagCategory.CUSTOM


class TagUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    category: TagCategory | None = None