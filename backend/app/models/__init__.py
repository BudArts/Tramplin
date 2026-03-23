# backend/app/models/__init__.py

# User - основная модель
from app.models.user import User, UserRole, UserStatus

# Company
from app.models.company import Company, CompanyStatus, CompanySize

# Остальные модели импортируем с проверкой
try:
    from app.models.opportunity import Opportunity
except ImportError:
    Opportunity = None

try:
    from app.models.application import Application
except ImportError:
    Application = None

try:
    from app.models.favorite import Favorite
except ImportError:
    Favorite = None

try:
    from app.models.notification import Notification
except ImportError:
    Notification = None

try:
    from app.models.chat import ChatRoom, ChatMessage
except ImportError:
    ChatRoom = None
    ChatMessage = None

try:
    from app.models.contact import Contact
except ImportError:
    Contact = None

try:
    from app.models.tag import Tag
except ImportError:
    Tag = None

try:
    from app.models.recommendation import Recommendation
except ImportError:
    Recommendation = None

try:
    from app.models.support import SupportTicket
except ImportError:
    SupportTicket = None


__all__ = [
    "User",
    "UserRole",
    "UserStatus",
    "Company",
    "CompanyStatus", 
    "CompanySize",
    "Opportunity",
    "Application",
    "Favorite",
    "Notification",
    "ChatRoom",
    "ChatMessage",
    "Contact",
    "Tag",
    "Recommendation",
    "SupportTicket",
]