# backend/app/models/__init__.py
from app.database import Base
from app.models.user import User, UserRole, UserStatus, PrivacyLevel, ApplicantProfile
from app.models.company import Company, CompanyStatus, CompanySize, VerificationStatus, TrustLevel

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
    from app.models.chat import ChatMessage
except ImportError:
    ChatMessage = None

try:
    from app.models.contact import Contact
except ImportError:
    Contact = None

try:
    from app.models.tag import Tag, TagSynonym
except ImportError:
    Tag = None
    TagSynonym = None

try:
    from app.models.recommendation import Recommendation
except ImportError:
    Recommendation = None

try:
    from app.models.support import SupportTicket
except ImportError:
    SupportTicket = None

__all__ = [
    "Base", "User", "UserRole", "UserStatus", "PrivacyLevel", "ApplicantProfile",
    "Company", "CompanyStatus", "CompanySize", "VerificationStatus", "TrustLevel",
    "Opportunity", "Application", "Favorite", "Notification",
    "ChatMessage", "Contact", "Tag", "TagSynonym", "Recommendation", "SupportTicket",
]