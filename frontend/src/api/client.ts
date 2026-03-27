// frontend/src/api/client.ts
const API_BASE_URL = '';

interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        console.log('clearTokens - tokens cleared');
    }

    isAuthenticated(): boolean {
        return !!localStorage.getItem('access_token');
    }

    getUser(): any {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        let url = endpoint;

        const fullUrl = `${this.baseUrl}${url}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`Request to ${fullUrl} with token`);
        } else {
            console.log(`Request to ${fullUrl} WITHOUT token`);
        }

        try {
            let response = await fetch(fullUrl, { ...options, headers });
            console.log(`Response from ${fullUrl}:`, response.status);

            if (response.status === 401) {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    console.log('Token expired, refreshing...');
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        const newToken = localStorage.getItem('access_token');
                        if (newToken) {
                            headers['Authorization'] = `Bearer ${newToken}`;
                        }
                        response = await fetch(fullUrl, { ...options, headers });
                        console.log(`Retry response from ${fullUrl}:`, response.status);
                    } else {
                        this.clearTokens();
                    }
                }
            }

            const data = await response.json();

            if (!response.ok) {
                console.log(`Error response:`, data);
                return {
                    error: data.detail || data.message || 'Произошла ошибка',
                    status: response.status,
                };
            }

            return { data, status: response.status };
        } catch (error) {
            console.error('Request error:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 0,
            };
        }
    }

    private async refreshAccessToken(): Promise<boolean> {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;

        console.log('Refreshing access token...');
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                console.log('Token refreshed successfully');
                return true;
            }

            console.log('Token refresh failed');
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
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

        let url = endpoint;
        if (url.startsWith('/api/')) {
            url = url.replace('/api', '');
        }
        const fullUrl = `${this.baseUrl}${url}`;

        const headers: HeadersInit = {};

        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(fullUrl, {
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

export const apiClient = new ApiClient('');

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
        updateMe: (data: any) => apiClient.patch('/users/me', data),
        getStudents: (params?: any) => apiClient.get('/users/students', params),
        getUniversities: (params?: any) => apiClient.get('/users/universities', params),
    },

    // Favorites
    favorites: {
        getOpportunities: () => apiClient.get('/api/favorites'),
        addOpportunity: (opportunityId: number) => apiClient.post(`/api/favorites/opportunity/${opportunityId}`),
        removeOpportunity: (opportunityId: number) => apiClient.delete(`/api/favorites/opportunity/${opportunityId}`),
        getCompanies: () => apiClient.get('/api/favorites/companies'),
        addCompany: (companyId: number) => apiClient.post(`/api/favorites/company/${companyId}`),
        removeCompany: (companyId: number) => apiClient.delete(`/api/favorites/company/${companyId}`),
        getCompanyIds: () => apiClient.get('/api/favorites/companies/ids'),
    },

    // Applications
    applications: {
        create: (data: any) => apiClient.post('/api/applications', data),
        getMy: (params?: { status?: string; page?: number; per_page?: number }) =>
            apiClient.get('/api/applications/my', params),
        withdraw: (applicationId: number) => apiClient.delete(`/api/applications/${applicationId}`),
        updateStatus: (applicationId: number, data: any) =>
            apiClient.patch(`/api/applications/${applicationId}/status`, data),
        getForOpportunity: (opportunityId: number, params?: { status?: string }) =>
            apiClient.get(`/api/applications/opportunity/${opportunityId}`, params),
    },

    // Contacts
    contacts: {
        list: () => apiClient.get('/api/contacts'),
        incomingRequests: () => apiClient.get('/api/contacts/requests'),
        outgoingRequests: () => apiClient.get('/api/contacts/outgoing'),
        sendRequest: (targetUserId: number) => apiClient.post(`/api/contacts/${targetUserId}/request`),
        accept: (contactId: number) => apiClient.post(`/api/contacts/${contactId}/accept`),
        reject: (contactId: number) => apiClient.post(`/api/contacts/${contactId}/reject`),
        remove: (contactId: number) => apiClient.delete(`/api/contacts/${contactId}`),
        recommend: (data: any) => apiClient.post('/api/contacts/recommend', data),
        getRecommendations: () => apiClient.get('/api/contacts/recommendations'),
    },

    // Chat
    chat: {
        getConversations: () => apiClient.get('/api/chat/conversations'),
        getMessages: (otherUserId: number, params?: { page?: number; per_page?: number }) =>
            apiClient.get(`/api/chat/with/${otherUserId}`, params),
        sendMessage: (data: any) => apiClient.post('/api/chat', data),
        getUnreadCount: () => apiClient.get('/api/chat/unread'),
    },

    // Notifications
    notifications: {
        get: (params?: { page?: number; per_page?: number }) => apiClient.get('/api/notifications', params),
        markAsRead: (notificationId: number) => apiClient.patch(`/api/notifications/${notificationId}/read`),
        markAllAsRead: () => apiClient.patch('/api/notifications/read-all'),
        getUnreadCount: () => apiClient.get('/api/notifications/unread-count'),
    },

    // Opportunities
    opportunities: {
        list: (params?: any) => apiClient.get('/api/opportunities', params),
        getMapPoints: (params?: any) => apiClient.get('/api/opportunities/map', params),
        getById: (opportunityId: number) => apiClient.get(`/api/opportunities/${opportunityId}`),
        incrementView: (opportunityId: number) => apiClient.post(`/api/opportunities/${opportunityId}/view`),
        getMy: (params?: { status?: string }) => apiClient.get('/api/opportunities/my', params),
        update: (opportunityId: number, data: any) => apiClient.put(`/api/opportunities/${opportunityId}`, data),
        delete: (opportunityId: number) => apiClient.delete(`/api/opportunities/${opportunityId}`),
        updateStatus: (opportunityId: number, data: any) =>
            apiClient.patch(`/api/opportunities/${opportunityId}/status`, data),
    },

    // Companies
    companies: {
        list: (params?: { skip?: number; limit?: number; industry?: string }) =>
            apiClient.get('/companies', params),
        getById: (companyId: number) => apiClient.get(`/companies/${companyId}`),
        getPending: (params?: { skip?: number; limit?: number }) =>
            apiClient.get('/companies/moderation/pending', params),
    },

    // Reviews
    reviews: {
        getForCompany: (companyId: number, params?: { page?: number; per_page?: number; sort_by?: string }) =>
            apiClient.get(`/api/reviews/companies/${companyId}`, params),
        getStats: (companyId: number) => apiClient.get(`/api/reviews/companies/${companyId}/stats`),
        create: (companyId: number, data: any) => apiClient.post(`/api/reviews/companies/${companyId}`, data),
        update: (reviewId: number, data: any) => apiClient.put(`/api/reviews/${reviewId}`, data),
        delete: (reviewId: number) => apiClient.delete(`/api/reviews/${reviewId}`),
        addResponse: (reviewId: number, data: any) => apiClient.post(`/api/reviews/${reviewId}/response`, data),
        markHelpful: (reviewId: number, isHelpful: boolean) =>
            apiClient.post(`/api/reviews/${reviewId}/helpful?is_helpful=${isHelpful}`),
    },

    // Tags
    tags: {
        list: (params?: { category?: string; approved_only?: boolean }) =>
            apiClient.get('/api/tags', params),
        popular: (params?: { limit?: number }) => apiClient.get('/api/tags/popular', params),
        suggest: (query: string, limit?: number) =>
            apiClient.get('/api/tags/suggest', { q: query, limit }),
        propose: (data: { name: string; category?: string }) => apiClient.post('/api/tags', data),
    },

    // Uploads
    uploads: {
        image: (file: File) => apiClient.uploadFile('/api/uploads/image', file),
        document: (file: File) => apiClient.uploadFile('/api/uploads/document', file),
    },
};