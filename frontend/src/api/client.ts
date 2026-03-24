// api/client.ts
// API клиент для работы с бэкендом

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
}

class ApiClient {
    private baseUrl: string;
    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.loadTokensFromStorage();
    }

    private loadTokensFromStorage() {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    private saveTokens(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            let response = await fetch(url, { ...options, headers });
            
            // Если токен истек, пытаемся обновить
            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                    response = await fetch(url, { ...options, headers });
                } else {
                    this.clearTokens();
                }
            }

            const data = await response.json();
            
            if (!response.ok) {
                return {
                    error: data.detail || data.message || 'Произошла ошибка',
                    status: response.status,
                };
            }

            return { data, status: response.status };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 0,
            };
        }
    }

    private async refreshAccessToken(): Promise<boolean> {
        if (!this.refreshToken) return false;

        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: this.refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            this.saveTokens(data.access_token, data.refresh_token);
            return true;
        }
        
        return false;
    }

    async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        return this.request<T>(url, { method: 'GET' });
    }

    async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    async uploadFile(endpoint: string, file: File): Promise<ApiResponse<{ url: string }>> {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${this.baseUrl}${endpoint}`;
        const headers: HeadersInit = {};

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    error: error.detail || 'Upload failed',
                    status: response.status,
                };
            }

            const data = await response.json();
            return { data, status: response.status };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Upload failed',
                status: 0,
            };
        }
    }
}

export const apiClient = new ApiClient(API_BASE_URL);

// API Methods
export const api = {
    // Auth
    auth: {
        register: (data: RegisterRequest) => apiClient.post<TokenResponse>('/api/auth/register', data),
        login: (data: LoginRequest) => apiClient.post<TokenResponse>('/api/auth/login', data),
        refresh: (refreshToken: string) => apiClient.post<TokenResponse>('/api/auth/refresh', { refresh_token: refreshToken }),
    },

    // Users
    users: {
        me: () => apiClient.get<UserResponse>('/api/users/me'),
        updateMe: (data: UserUpdate) => apiClient.put<UserResponse>('/api/users/me', data),
        getApplicantProfile: () => apiClient.get<ApplicantProfileResponse>('/api/users/me/applicant-profile'),
        updateApplicantProfile: (data: ApplicantProfileUpdate) => apiClient.put<ApplicantProfileResponse>('/api/users/me/applicant-profile', data),
        updatePrivacySettings: (data: PrivacySettingsUpdate) => apiClient.put<MessageResponse>('/api/users/me/privacy', data),
        getUserProfile: (userId: number) => apiClient.get<ApplicantPublicProfile | UserResponse>(`/api/users/${userId}`),
    },

    // Companies
    companies: {
        list: (params?: { search?: string; industry?: string; city?: string; verified_only?: boolean; page?: number; per_page?: number }) =>
            apiClient.get<CompanyShort[]>('/api/companies', params),
        getMyCompany: () => apiClient.get<CompanyDetailResponse>('/api/companies/me'),
        updateMyCompany: (data: CompanyUpdate) => apiClient.put<CompanyResponse>('/api/companies/me', data),
        requestVerification: (data: VerificationRequest) => apiClient.post<MessageResponse>('/api/companies/me/verify', data),
        getCompany: (companyId: number) => apiClient.get<CompanyResponse>(`/api/companies/${companyId}`),
        getCompanyStats: (companyId: number) => apiClient.get<Record<string, any>>(`/api/companies/${companyId}/stats`),
    },

    // Tags
    tags: {
        list: (params?: { category?: TagCategory; approved_only?: boolean }) => apiClient.get<TagResponse[]>('/api/tags', params),
        propose: (data: TagCreate) => apiClient.post<TagResponse>('/api/tags', data),
        popular: (limit?: number) => apiClient.get<TagResponse[]>('/api/tags/popular', { limit }),
        suggest: (q: string, limit?: number) => apiClient.get<TagResponse[]>('/api/tags/suggest', { q, limit }),
    },

    // Opportunities
    opportunities: {
        list: (params?: {
            search?: string;
            type?: string;
            work_format?: string;
            tags?: string;
            salary_min?: number;
            salary_max?: number;
            city?: string;
            company_id?: number;
            sort?: string;
            order?: string;
            page?: number;
            per_page?: number;
        }) => apiClient.get<OpportunityListResponse>('/api/opportunities', params),
        getMapPoints: (params?: {
            type?: string;
            work_format?: string;
            tags?: string;
            salary_min?: number;
            salary_max?: number;
            city?: string;
        }) => apiClient.get<MapPointResponse[]>('/api/opportunities/map', params),
        getMy: (status?: string) => apiClient.get<OpportunityResponse[]>('/api/opportunities/my', { status }),
        create: (data: OpportunityCreate) => apiClient.post<OpportunityResponse>('/api/opportunities', data),
        getById: (opportunityId: number) => apiClient.get<OpportunityResponse>(`/api/opportunities/${opportunityId}`),
        update: (opportunityId: number, data: OpportunityUpdate) => apiClient.put<OpportunityResponse>(`/api/opportunities/${opportunityId}`, data),
        delete: (opportunityId: number) => apiClient.delete<MessageResponse>(`/api/opportunities/${opportunityId}`),
        changeStatus: (opportunityId: number, data: StatusUpdate) => apiClient.patch<OpportunityResponse>(`/api/opportunities/${opportunityId}/status`, data),
    },

    // Applications
    applications: {
        create: (data: ApplicationCreate) => apiClient.post<ApplicationResponse>('/api/applications', data),
        getMy: (params?: { status?: string; page?: number; per_page?: number }) =>
            apiClient.get<ApplicationListResponse>('/api/applications/my', params),
        withdraw: (applicationId: number) => apiClient.delete<MessageResponse>(`/api/applications/${applicationId}`),
        getByOpportunity: (opportunityId: number, status?: string) =>
            apiClient.get<ApplicationWithApplicant[]>(`/api/applications/opportunity/${opportunityId}`, { status }),
        updateStatus: (applicationId: number, data: ApplicationStatusUpdate) =>
            apiClient.patch<ApplicationResponse>(`/api/applications/${applicationId}/status`, data),
    },

    // Favorites
    favorites: {
        getOpportunities: () => apiClient.get<OpportunityCardResponse[]>('/api/favorites'),
        addOpportunity: (opportunityId: number) => apiClient.post<MessageResponse>(`/api/favorites/opportunity/${opportunityId}`),
        removeOpportunity: (opportunityId: number) => apiClient.delete<MessageResponse>(`/api/favorites/opportunity/${opportunityId}`),
        getCompanies: () => apiClient.get<CompanyShort[]>('/api/favorites/companies'),
        addCompany: (companyId: number) => apiClient.post<MessageResponse>(`/api/favorites/company/${companyId}`),
        removeCompany: (companyId: number) => apiClient.delete<MessageResponse>(`/api/favorites/company/${companyId}`),
        getCompanyIds: () => apiClient.get<number[]>('/api/favorites/companies/ids'),
    },

    // Notifications
    notifications: {
        get: () => apiClient.get<NotificationListResponse>('/api/notifications'),
        markAsRead: (notificationId: number) => apiClient.patch<MessageResponse>(`/api/notifications/${notificationId}/read`),
        markAllAsRead: () => apiClient.patch<MessageResponse>('/api/notifications/read-all'),
        getUnreadCount: () => apiClient.get<{ unread_count: number }>('/api/notifications/unread-count'),
    },

    // Contacts
    contacts: {
        list: () => apiClient.get<ContactListResponse>('/api/contacts'),
        incomingRequests: () => apiClient.get<ContactListResponse>('/api/contacts/requests'),
        outgoingRequests: () => apiClient.get<ContactListResponse>('/api/contacts/outgoing'),
        sendRequest: (targetUserId: number) => apiClient.post<MessageResponse>(`/api/contacts/${targetUserId}/request`),
        accept: (contactId: number) => apiClient.post<MessageResponse>(`/api/contacts/${contactId}/accept`),
        reject: (contactId: number) => apiClient.post<MessageResponse>(`/api/contacts/${contactId}/reject`),
        remove: (contactId: number) => apiClient.delete<MessageResponse>(`/api/contacts/${contactId}`),
        recommend: (data: RecommendationCreate) => apiClient.post<MessageResponse>('/api/contacts/recommend', data),
        getRecommendations: () => apiClient.get<RecommendationResponse[]>('/api/contacts/recommendations'),
    },

    // Chat
    chat: {
        getConversations: () => apiClient.get<ConversationResponse[]>('/api/chat/conversations'),
        getMessages: (otherUserId: number, page?: number, per_page?: number) =>
            apiClient.get<ChatMessageResponse[]>(`/api/chat/with/${otherUserId}`, { page, per_page }),
        sendMessage: (data: ChatMessageCreate) => apiClient.post<ChatMessageResponse>('/api/chat', data),
        getUnreadCount: () => apiClient.get<{ unread_count: number }>('/api/chat/unread'),
    },

    // Uploads
    uploads: {
        image: (file: File) => apiClient.uploadFile('/api/uploads/image', file),
        document: (file: File) => apiClient.uploadFile('/api/uploads/document', file),
    },

    // Support
    support: {
        createTicket: (data: TicketCreate) => apiClient.post<TicketResponse>('/api/support', data),
        getMyTickets: () => apiClient.get<TicketResponse[]>('/api/support/my'),
    },

    // Curator
    curator: {
        getStats: () => apiClient.get<PlatformStats>('/api/curator/stats'),
        getPendingCompanies: () => apiClient.get<CompanyDetailResponse[]>('/api/curator/companies/pending'),
        getAllCompanies: (params?: { status?: string; search?: string }) =>
            apiClient.get<CompanyDetailResponse[]>('/api/curator/companies', params),
        verifyCompany: (companyId: number, data: VerificationDecision) =>
            apiClient.patch<MessageResponse>(`/api/curator/companies/${companyId}/verify`, data),
        getPendingOpportunities: () => apiClient.get<OpportunityResponse[]>('/api/curator/opportunities/pending'),
        approveOpportunity: (opportunityId: number) =>
            apiClient.patch<MessageResponse>(`/api/curator/opportunities/${opportunityId}/approve`),
        rejectOpportunity: (opportunityId: number, data: ModerationDecision) =>
            apiClient.patch<MessageResponse>(`/api/curator/opportunities/${opportunityId}/reject`, data),
        requestChanges: (opportunityId: number, data: ModerationDecision) =>
            apiClient.patch<MessageResponse>(`/api/curator/opportunities/${opportunityId}/request-changes`, data),
        listUsers: (params?: { role?: string; search?: string; is_active?: boolean; page?: number; per_page?: number }) =>
            apiClient.get<UserResponse[]>('/api/curator/users', params),
        updateUserStatus: (userId: number, data: UserStatusUpdate) =>
            apiClient.patch<MessageResponse>(`/api/curator/users/${userId}/status`, data),
        editUser: (userId: number, displayName?: string | null, role?: UserRole | null) =>
            apiClient.put<UserResponse>(`/api/curator/users/${userId}`, undefined, { display_name: displayName, role } as any),
        getPendingTags: () => apiClient.get<TagResponse[]>('/api/curator/tags/pending'),
        approveTag: (tagId: number) => apiClient.patch<MessageResponse>(`/api/curator/tags/${tagId}/approve`),
        rejectTag: (tagId: number) => apiClient.patch<MessageResponse>(`/api/curator/tags/${tagId}/reject`),
        createCurator: (data: CuratorCreate) => apiClient.post<UserResponse>('/api/curator/curators', data),
        editOpportunity: (opportunityId: number, data: OpportunityUpdate) =>
            apiClient.put<OpportunityResponse>(`/api/curator/opportunities/${opportunityId}`, data),
        editCompany: (companyId: number, data: CompanyUpdate) =>
            apiClient.put<CompanyDetailResponse>(`/api/curator/companies/${companyId}`, data),
        editApplicant: (userId: number, data: ApplicantProfileUpdate) =>
            apiClient.put<MessageResponse>(`/api/curator/applicants/${userId}`, data),
    },

    auth: {
    // ... существующие методы
    
    // Добавьте эти методы:
    verifyEmail: (data: { token: string }) => 
      apiClient.post<MessageResponse>('/api/auth/verify-email', data),
    
    resendVerification: (data: { email: string }) => 
      apiClient.post<MessageResponse>('/api/auth/resend-verification', data),
  },
};