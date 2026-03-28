from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Recommendation(Base):
    __tablename__ = "user_recommendations"  # ← используем правильную таблицу

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)  # ← поле уже есть
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    from_user = relationship("User", foreign_keys=[from_user_id], backref="sent_recommendations")
    to_user = relationship("User", foreign_keys=[to_user_id], backref="received_recommendations")
    opportunity = relationship("Opportunity", backref="recommendations")