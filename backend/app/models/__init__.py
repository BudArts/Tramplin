"""
Модели базы данных
"""
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus, VerificationStatus
from app.models.opportunity import Opportunity, OpportunityType, OpportunityStatus
from app.models.application import Application, ApplicationStatus
from app.models.tag import Tag, opportunity_tags
from app.models.favorite import Favorite
from app.models.notification import Notification, NotificationType
from app.models.chat import ChatMessage
from app.models.contact import Contact
from app.models.support import SupportTicket, TicketStatus, TicketCategory  # Исправлено!
from app.models.recommendation import Recommendation
from app.models.review import Review, ReviewHelpful

__all__ = [
    # User
    "User",
    "UserRole",
    # Company
    "Company",
    "CompanyStatus",
    "VerificationStatus",
    # Opportunity
    "Opportunity",
    "OpportunityType",
    "OpportunityStatus",
    # Application
    "Application",
    "ApplicationStatus",
    # Tag
    "Tag",
    "opportunity_tags",
    # Favorite
    "Favorite",
    # Notification
    "Notification",
    "NotificationType",
    # Chat
    "ChatMessage",
    # Contact
    "Contact",
    # Support
    "SupportTicket",
    "TicketStatus",
    "TicketCategory",  # Исправлено!
    # Recommendation
    "Recommendation",
    # Review
    "Review",
    "ReviewHelpful",
]