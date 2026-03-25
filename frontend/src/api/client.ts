// frontend/src/api/client.ts
// API клиент для работы с бэкендом

const API_BASE_URL = '/api';

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

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
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
                if (value !== undefined && value !== null && value !== '') {
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
        register: (data: any) => apiClient.post('/auth/register', data),
        login: (data: any) => apiClient.post('/auth/login', data),
        refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
        verifyEmail: (data: { token: string }) => apiClient.post('/auth/verify-email', data),
        resendVerification: (data: { email: string }) => apiClient.post('/auth/resend-verification', data),
    },

    // Users
    users: {
        me: () => apiClient.get('/users/me'),
        updateMe: (data: any) => apiClient.put('/users/me', data),
        getApplicantProfile: () => apiClient.get('/users/me/applicant-profile'),
        updateApplicantProfile: (data: any) => apiClient.put('/users/me/applicant-profile', data),
        updatePrivacySettings: (data: any) => apiClient.put('/users/me/privacy', data),
        getUserProfile: (userId: number) => apiClient.get(`/users/${userId}`),
    },

    // Companies
    companies: {
        list: (params?: { search?: string; industry?: string; city?: string; verified_only?: boolean; page?: number; per_page?: number }) =>
            apiClient.get('/companies', params),
        getMyCompany: () => apiClient.get('/companies/me'),
        updateMyCompany: (data: any) => apiClient.put('/companies/me', data),
        requestVerification: (data: any) => apiClient.post('/companies/me/verify', data),
        getCompany: (companyId: number) => apiClient.get(`/companies/${companyId}`),
        getCompanyStats: (companyId: number) => apiClient.get(`/companies/${companyId}/stats`),
        checkInn: (data: { inn: string }) => apiClient.post('/companies/check-inn', data),
        register: (data: any) => apiClient.post('/companies/register', data),
    },

    // Tags
    tags: {
        list: (params?: { category?: string; approved_only?: boolean }) => apiClient.get('/tags', params),
        propose: (data: any) => apiClient.post('/tags', data),
        popular: (limit?: number) => apiClient.get('/tags/popular', { limit }),
        suggest: (q: string, limit?: number) => apiClient.get('/tags/suggest', { q, limit }),
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
        }) => apiClient.get('/opportunities', params),
        getMapPoints: (params?: any) => apiClient.get('/opportunities/map', params),
        getMy: (status?: string) => apiClient.get('/opportunities/my', { status }),
        create: (data: any) => apiClient.post('/opportunities', data),
        getById: (opportunityId: number) => apiClient.get(`/opportunities/${opportunityId}`),
        update: (opportunityId: number, data: any) => apiClient.put(`/opportunities/${opportunityId}`, data),
        delete: (opportunityId: number) => apiClient.delete(`/opportunities/${opportunityId}`),
        changeStatus: (opportunityId: number, data: any) => apiClient.patch(`/opportunities/${opportunityId}/status`, data),
    },

    // Applications
    applications: {
        create: (data: any) => apiClient.post('/applications', data),
        getMy: (params?: { status?: string; page?: number; per_page?: number }) =>
            apiClient.get('/applications/my', params),
        withdraw: (applicationId: number) => apiClient.delete(`/applications/${applicationId}`),
        getByOpportunity: (opportunityId: number, status?: string) =>
            apiClient.get(`/applications/opportunity/${opportunityId}`, { status }),
        updateStatus: (applicationId: number, data: any) =>
            apiClient.patch(`/applications/${applicationId}/status`, data),
    },

    // Favorites
    favorites: {
        getOpportunities: () => apiClient.get('/favorites'),
        addOpportunity: (opportunityId: number) => apiClient.post(`/favorites/opportunity/${opportunityId}`),
        removeOpportunity: (opportunityId: number) => apiClient.delete(`/favorites/opportunity/${opportunityId}`),
        getCompanies: () => apiClient.get('/favorites/companies'),
        addCompany: (companyId: number) => apiClient.post(`/favorites/company/${companyId}`),
        removeCompany: (companyId: number) => apiClient.delete(`/favorites/company/${companyId}`),
        getCompanyIds: () => apiClient.get('/favorites/companies/ids'),
    },

    // Notifications
    notifications: {
        get: () => apiClient.get('/notifications'),
        markAsRead: (notificationId: number) => apiClient.patch(`/notifications/${notificationId}/read`),
        markAllAsRead: () => apiClient.patch('/notifications/read-all'),
        getUnreadCount: () => apiClient.get('/notifications/unread-count'),
    },

    // Contacts
    contacts: {
        list: () => apiClient.get('/contacts'),
        incomingRequests: () => apiClient.get('/contacts/requests'),
        outgoingRequests: () => apiClient.get('/contacts/outgoing'),
        sendRequest: (targetUserId: number) => apiClient.post(`/contacts/${targetUserId}/request`),
        accept: (contactId: number) => apiClient.post(`/contacts/${contactId}/accept`),
        reject: (contactId: number) => apiClient.post(`/contacts/${contactId}/reject`),
        remove: (contactId: number) => apiClient.delete(`/contacts/${contactId}`),
        recommend: (data: any) => apiClient.post('/contacts/recommend', data),
        getRecommendations: () => apiClient.get('/contacts/recommendations'),
    },

    // Chat
    chat: {
        getConversations: () => apiClient.get('/chat/conversations'),
        getMessages: (otherUserId: number, page?: number, per_page?: number) =>
            apiClient.get(`/chat/with/${otherUserId}`, { page, per_page }),
        sendMessage: (data: any) => apiClient.post('/chat', data),
        getUnreadCount: () => apiClient.get('/chat/unread'),
    },

    // Uploads
    uploads: {
        image: (file: File) => apiClient.uploadFile('/uploads/image', file),
        document: (file: File) => apiClient.uploadFile('/uploads/document', file),
    },

    // Support
    support: {
        createTicket: (data: any) => apiClient.post('/support', data),
        getMyTickets: () => apiClient.get('/support/my'),
    },

    // Curator
    curator: {
        getStats: () => apiClient.get('/curator/stats'),
        getPendingCompanies: () => apiClient.get('/curator/companies/pending'),
        getAllCompanies: (params?: { status?: string; search?: string }) =>
            apiClient.get('/curator/companies', params),
        verifyCompany: (companyId: number, data: any) =>
            apiClient.patch(`/curator/companies/${companyId}/verify`, data),
        getPendingOpportunities: () => apiClient.get('/curator/opportunities/pending'),
        approveOpportunity: (opportunityId: number) =>
            apiClient.patch(`/curator/opportunities/${opportunityId}/approve`),
        rejectOpportunity: (opportunityId: number, data: any) =>
            apiClient.patch(`/curator/opportunities/${opportunityId}/reject`, data),
        requestChanges: (opportunityId: number, data: any) =>
            apiClient.patch(`/curator/opportunities/${opportunityId}/request-changes`, data),
        listUsers: (params?: { role?: string; search?: string; is_active?: boolean; page?: number; per_page?: number }) =>
            apiClient.get('/curator/users', params),
        updateUserStatus: (userId: number, data: any) =>
            apiClient.patch(`/curator/users/${userId}/status`, data),
        editUser: (userId: number, displayName?: string | null, role?: string | null) =>
            apiClient.put(`/curator/users/${userId}`, { display_name: displayName, role }),
        getPendingTags: () => apiClient.get('/curator/tags/pending'),
        approveTag: (tagId: number) => apiClient.patch(`/curator/tags/${tagId}/approve`),
        rejectTag: (tagId: number) => apiClient.patch(`/curator/tags/${tagId}/reject`),
        createCurator: (data: any) => apiClient.post('/curator/curators', data),
        editOpportunity: (opportunityId: number, data: any) =>
            apiClient.put(`/curator/opportunities/${opportunityId}`, data),
        editCompany: (companyId: number, data: any) =>
            apiClient.put(`/curator/companies/${companyId}`, data),
        editApplicant: (userId: number, data: any) =>
            apiClient.put(`/curator/applicants/${userId}`, data),
    },

    // Reviews
    reviews: {
        getCompanyStats: (companyId: number) => apiClient.get(`/companies/${companyId}/stats`),
        getCompanyReviews: (companyId: number, params?: { page?: number; per_page?: number }) =>
            apiClient.get(`/companies/${companyId}/reviews`, params),
        createReview: (data: any) => apiClient.post('/reviews', data),
        updateReview: (reviewId: number, data: any) => apiClient.put(`/reviews/${reviewId}`, data),
        deleteReview: (reviewId: number) => apiClient.delete(`/reviews/${reviewId}`),
        getMyReviews: () => apiClient.get('/reviews/my'),
    },
};