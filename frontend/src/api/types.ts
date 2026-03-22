// api/types.ts
// Типы данных на основе OpenAPI документации

export type UserRole = 'applicant' | 'employer' | 'curator' | 'admin';

export type OpportunityType = 'internship' | 'vacancy' | 'mentorship' | 'event';

export type WorkFormat = 'office' | 'hybrid' | 'remote';

export type OpportunityStatus = 'draft' | 'pending_moderation' | 'active' | 'scheduled' | 'closed' | 'rejected';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export type ApplicationStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'reserve';

export type VerificationStatus = 'pending' | 'email_confirmed' | 'inn_verified' | 'verified' | 'rejected';

export type TrustLevel = 'new' | 'trusted' | 'premium';

export type PrivacyLevel = 'private' | 'contacts' | 'public' | 'full_public';

export type TagCategory = 'technology' | 'level' | 'employment_type' | 'domain' | 'custom';

export type ContactStatus = 'pending' | 'accepted' | 'rejected';

export type NotificationType = 'application_status' | 'new_application' | 'verification_update' | 'moderation_update' | 'contact_request' | 'contact_accepted' | 'recommendation' | 'system';

export type TicketCategory = 'technical' | 'account' | 'verification' | 'moderation' | 'other';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

// User Schemas
export interface UserResponse {
    id: number;
    email: string;
    display_name: string;
    role: UserRole;
    is_active: boolean;
    avatar_url: string | null;
    created_at: string;
}

export interface UserShort {
    id: number;
    display_name: string;
    role: UserRole;
    avatar_url: string | null;
}

export interface UserUpdate {
    display_name?: string | null;
    avatar_url?: string | null;
}

// Auth Schemas
export interface RegisterRequest {
    email: string;
    password: string;
    display_name: string;
    role: UserRole;
    company_name?: string | null;
    inn?: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshRequest {
    refresh_token: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user_id: number;
    role: UserRole;
}

// Applicant Profile Schemas
export interface ApplicantProfileResponse {
    user_id: number;
    first_name: string;
    last_name: string;
    patronymic: string | null;
    university: string | null;
    faculty: string | null;
    course: number | null;
    graduation_year: number | null;
    bio: string | null;
    portfolio_url: string | null;
    github_url: string | null;
    resume_url: string | null;
    privacy_level: PrivacyLevel;
    show_applications_to_contacts: boolean;
    show_resume_to_all: boolean;
    profile_completeness: number;
    skills: TagResponse[];
    documents_url: string | null;
}

export interface ApplicantProfileUpdate {
    first_name?: string | null;
    last_name?: string | null;
    patronymic?: string | null;
    university?: string | null;
    faculty?: string | null;
    course?: number | null;
    graduation_year?: number | null;
    bio?: string | null;
    portfolio_url?: string | null;
    github_url?: string | null;
    resume_url?: string | null;
    skill_ids?: number[] | null;
    documents_url?: string | null;
}

export interface ApplicantPublicProfile {
    user_id: number;
    display_name: string;
    first_name: string;
    last_name: string;
    university: string | null;
    faculty: string | null;
    course: number | null;
    graduation_year: number | null;
    bio: string | null;
    portfolio_url: string | null;
    github_url: string | null;
    skills: TagResponse[];
    avatar_url: string | null;
}

export interface PrivacySettingsUpdate {
    privacy_level?: PrivacyLevel | null;
    show_applications_to_contacts?: boolean | null;
    show_resume_to_all?: boolean | null;
}

// Company Schemas
export interface CompanyShort {
    id: number;
    name: string;
    industry: string | null;
    logo_url: string | null;
    city: string | null;
    verification_status: VerificationStatus;
}

export interface CompanyResponse {
    id: number;
    name: string;
    description: string | null;
    industry: string | null;
    website: string | null;
    social_links: string[] | null;
    logo_url: string | null;
    office_photos: string[] | null;
    city: string | null;
    verification_status: VerificationStatus;
    trust_level: TrustLevel;
    created_at: string;
}

export interface CompanyDetailResponse extends CompanyResponse {
    inn: string | null;
    corporate_email: string | null;
    verification_comment: string | null;
    verified_at: string | null;
    approved_cards_count: number;
    owner_id: number;
}

export interface CompanyUpdate {
    name?: string | null;
    description?: string | null;
    industry?: string | null;
    website?: string | null;
    social_links?: string[] | null;
    logo_url?: string | null;
    office_photos?: string[] | null;
    city?: string | null;
    corporate_email?: string | null;
}

export interface VerificationRequest {
    inn: string;
    corporate_email?: string | null;
    website?: string | null;
    comment?: string | null;
}

// Tag Schemas
export interface TagResponse {
    id: number;
    name: string;
    category: TagCategory;
    is_approved: boolean;
    usage_count: number;
}

export interface TagCreate {
    name: string;
    category?: TagCategory;
}

// Opportunity Schemas
export interface OpportunityCardResponse {
    id: number;
    title: string;
    type: OpportunityType;
    work_format: WorkFormat;
    salary_min: number | null;
    salary_max: number | null;
    city: string;
    company_name: string | null;
    company_logo: string | null;
    tags: TagResponse[];
    published_at: string | null;
}

export interface OpportunityResponse {
    id: number;
    title: string;
    description: string;
    type: OpportunityType;
    work_format: WorkFormat;
    salary_min: number | null;
    salary_max: number | null;
    address: string | null;
    city: string;
    latitude: number | null;
    longitude: number | null;
    published_at: string | null;
    expires_at: string | null;
    event_date: string | null;
    status: OpportunityStatus;
    moderation_status: ModerationStatus;
    media_urls: string[] | null;
    contact_email: string | null;
    contact_phone: string | null;
    external_url: string | null;
    views_count: number;
    applications_count: number;
    created_at: string;
    tags: TagResponse[];
    company: CompanyShort | null;
}

export interface OpportunityCreate {
    title: string;
    description: string;
    type: OpportunityType;
    work_format: WorkFormat;
    salary_min?: number | null;
    salary_max?: number | null;
    address?: string | null;
    city: string;
    latitude?: number | null;
    longitude?: number | null;
    expires_at?: string | null;
    event_date?: string | null;
    media_urls?: string[] | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    external_url?: string | null;
    tag_ids: number[];
}

export interface OpportunityUpdate {
    title?: string | null;
    description?: string | null;
    type?: OpportunityType | null;
    work_format?: WorkFormat | null;
    salary_min?: number | null;
    salary_max?: number | null;
    address?: string | null;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    expires_at?: string | null;
    event_date?: string | null;
    media_urls?: string[] | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    external_url?: string | null;
    tag_ids?: number[] | null;
}

export interface StatusUpdate {
    status: OpportunityStatus;
}

export interface OpportunityListResponse {
    items: OpportunityResponse[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

// Map Point
export interface MapPointResponse {
    id: number;
    title: string;
    type: OpportunityType;
    latitude: number;
    longitude: number;
    company_id: number;
    company_name: string | null;
    salary_min: number | null;
    salary_max: number | null;
    top_tags: string[];
    is_favorite_company: boolean;
}

// Application Schemas
export interface ApplicationCreate {
    opportunity_id: number;
    cover_letter?: string | null;
}

export interface ApplicationResponse {
    id: number;
    applicant_id: number;
    opportunity_id: number;
    status: ApplicationStatus;
    cover_letter: string | null;
    created_at: string;
    updated_at: string;
}

export interface ApplicationWithOpportunity {
    id: number;
    applicant_id: number;
    opportunity_id: number;
    status: ApplicationStatus;
    cover_letter: string | null;
    created_at: string;
    updated_at: string;
    opportunity: OpportunityCardResponse | null;
}

export interface ApplicationWithApplicant {
    id: number;
    applicant_id: number;
    opportunity_id: number;
    status: ApplicationStatus;
    cover_letter: string | null;
    created_at: string;
    updated_at: string;
    applicant: UserShort | null;
}

export interface ApplicationListResponse {
    items: ApplicationWithOpportunity[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

export interface ApplicationStatusUpdate {
    status: ApplicationStatus;
}

// Favorites
export interface MessageResponse {
    message: string;
}

// Notifications
export interface NotificationResponse {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    link: string | null;
    created_at: string;
}

export interface NotificationListResponse {
    items: NotificationResponse[];
    total: number;
    unread_count: number;
}

// Contacts
export interface ContactResponse {
    id: number;
    user: UserShort;
    contact: UserShort;
    status: ContactStatus;
    created_at: string;
}

export interface ContactListResponse {
    items: ContactResponse[];
    total: number;
}

export interface RecommendationCreate {
    to_user_id: number;
    opportunity_id: number;
    message?: string | null;
}

export interface RecommendationResponse {
    id: number;
    from_user: UserShort;
    opportunity_id: number;
    message: string | null;
    is_read: boolean;
    created_at: string;
}

// Chat
export interface ChatMessageCreate {
    receiver_id: number;
    opportunity_id?: number | null;
    message: string;
}

export interface ChatMessageResponse {
    id: number;
    sender: UserShort;
    receiver: UserShort;
    opportunity_id: number | null;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface ConversationResponse {
    user: UserShort;
    last_message: string;
    last_message_at: string;
    unread_count: number;
    opportunity_id: number | null;
}

// Curator
export interface PlatformStats {
    total_users: number;
    total_applicants: number;
    total_employers: number;
    total_opportunities: number;
    active_opportunities: number;
    total_applications: number;
    pending_verifications: number;
    pending_moderations: number;
    total_tags: number;
}

export interface VerificationDecision {
    status: VerificationStatus;
    comment?: string | null;
}

export interface ModerationDecision {
    status: ModerationStatus;
    comment?: string | null;
}

export interface UserStatusUpdate {
    is_active: boolean;
}

export interface CuratorCreate {
    email: string;
    password: string;
    display_name: string;
}

// Support
export interface TicketCreate {
    category: TicketCategory;
    subject: string;
    message: string;
}

export interface TicketResponse {
    id: number;
    category: TicketCategory;
    subject: string;
    message: string;
    status: TicketStatus;
    response: string | null;
    created_at: string;
    updated_at: string;
}

export interface TicketReply {
    response: string;
    status?: TicketStatus;
}

// Существующие типы из вашего API

export type UserRole = 'applicant' | 'employer' | 'curator' | 'admin';

export interface UserResponse {
  id: number;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
  role: UserRole;
  company_name?: string;
  inn?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  user_id?: number;
  role?: UserRole;
}

// ... остальные типы из вашего API