from datetime import datetime

from sqlalchemy import (
    DateTime, Integer, ForeignKey, String, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "opportunity_id", name="uq_fav_opportunity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    opportunity_id: Mapped[int | None] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    opportunity: Mapped["Opportunity | None"] = relationship("Opportunity")

    def __repr__(self):
        return f"<Favorite user={self.user_id} opp={self.opportunity_id}>"


class FavoriteCompany(Base):
    __tablename__ = "favorite_companies"
    __table_args__ = (
        UniqueConstraint("user_id", "company_id", name="uq_fav_company"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    company: Mapped["Company"] = relationship("Company")

    def __repr__(self):
        return f"<FavoriteCompany user={self.user_id} company={self.company_id}>"