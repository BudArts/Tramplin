from app.schemas.common import PaginatedResponse, MessageResponse, ErrorResponse
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import (
    UserShort, UserResponse, ApplicantProfileResponse,
    ApplicantProfileUpdate, ApplicantPublicProfile,
    PrivacySettingsUpdate, UserUpdate,
)
from app.schemas.company import (
    CompanyResponse, CompanyShort, CompanyUpdate,
    CompanyDetailResponse, VerificationRequest,
)
from app.schemas.tag import TagResponse, TagCreate, TagUpdate
from app.schemas.opportunity import (
    OpportunityCreate, OpportunityUpdate, OpportunityResponse,
    OpportunityListResponse, OpportunityCardResponse,
    MapPointResponse, StatusUpdate,
)
from app.schemas.application import (
    ApplicationCreate, ApplicationResponse,
    ApplicationWithOpportunity, ApplicationWithApplicant,
    ApplicationStatusUpdate, ApplicationListResponse,
)
from app.schemas.contact import (
    ContactResponse, ContactListResponse,
    RecommendationCreate, RecommendationResponse,
)
from app.schemas.notification import NotificationResponse, NotificationListResponse
from app.schemas.curator import (
    VerificationDecision, ModerationDecision,
    UserStatusUpdate, CuratorCreate, PlatformStats,
)