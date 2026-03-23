# backend/app/models/tag.py
import enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, Enum, Boolean, Integer, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TagCategory(str, enum.Enum):
    TECHNOLOGY = "technology"
    LEVEL = "level"
    EMPLOYMENT_TYPE = "employment_type"
    DOMAIN = "domain"
    CUSTOM = "custom"


opportunity_tags = Table(
    "opportunity_tags", Base.metadata,
    Column("opportunity_id", ForeignKey("opportunities.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

user_tags = Table(
    "user_tags", Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[TagCategory] = mapped_column(Enum(TagCategory), index=True, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    opportunities: Mapped[List["Opportunity"]] = relationship("Opportunity", secondary=opportunity_tags, back_populates="tags")
    users: Mapped[List["User"]] = relationship("User", secondary=user_tags, back_populates="tags")

    def __repr__(self):
        return f"<Tag {self.id} {self.name}>"


class TagSynonym(Base):
    __tablename__ = "tag_synonyms"

    id: Mapped[int] = mapped_column(primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    synonym: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    tag: Mapped["Tag"] = relationship("Tag")