import enum

from sqlalchemy import (
    String, Enum, Boolean, Integer, ForeignKey, Table, Column,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TagCategory(str, enum.Enum):
    TECHNOLOGY = "technology"
    LEVEL = "level"
    EMPLOYMENT_TYPE = "employment_type"
    DOMAIN = "domain"
    CUSTOM = "custom"


# Ассоциативные таблицы
opportunity_tags = Table(
    "opportunity_tags",
    Base.metadata,
    Column("opportunity_id", ForeignKey("opportunities.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

applicant_tags = Table(
    "applicant_tags",
    Base.metadata,
    Column("user_id", ForeignKey("applicant_profiles.user_id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[TagCategory] = mapped_column(Enum(TagCategory), index=True, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    opportunities: Mapped[list["Opportunity"]] = relationship(
        "Opportunity", secondary=opportunity_tags, back_populates="tags"
    )
    applicants: Mapped[list["ApplicantProfile"]] = relationship(
        "ApplicantProfile", secondary=applicant_tags, back_populates="skills"
    )

    def __repr__(self):
        return f"<Tag {self.id} {self.name} [{self.category.value}]>"


class TagSynonym(Base):
    __tablename__ = "tag_synonyms"

    id: Mapped[int] = mapped_column(primary_key=True)
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), nullable=False
    )
    synonym: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    tag: Mapped["Tag"] = relationship("Tag")

    def __repr__(self):
        return f"<TagSynonym {self.synonym} -> Tag {self.tag_id}>"