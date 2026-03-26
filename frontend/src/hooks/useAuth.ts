import { useState, useEffect, useCallback } from 'react';

export interface UserResponse {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    patronymic: string | null;
    full_name: string | null;
    display_name: string | null;
    phone: string | null;
    role: string;
    status: string;
    is_email_verified: boolean;
    university: string | null;
    faculty: string | null;
    course: number | null;
    graduation_year: number | null;
    bio: string | null;
    avatar_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    created_at: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    patronymic?: string;
    phone?: string;
}

export const useAuth = () => {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        console.log('loadUser - token exists:', !!token);

        if (!token) {
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('loadUser - response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('loadUser - user loaded:', data);
                setUser(data);
                setIsAuthenticated(true);
            } else if (response.status === 401) {
                // Попробуем обновить токен
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    console.log('loadUser - trying to refresh token...');
                    const refreshResponse = await fetch('/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: refreshToken }),
                    });

                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        localStorage.setItem('access_token', refreshData.access_token);
                        localStorage.setItem('refresh_token', refreshData.refresh_token);
                        console.log('loadUser - token refreshed, retrying...');

                        // Повторяем запрос с новым токеном
                        const retryResponse = await fetch('/users/me', {
                            headers: {
                                'Authorization': `Bearer ${refreshData.access_token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            console.log('loadUser - user loaded after refresh:', retryData);
                            setUser(retryData);
                            setIsAuthenticated(true);
                        } else {
                            console.log('loadUser - retry failed, clearing tokens');
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('refresh_token');
                            setUser(null);
                            setIsAuthenticated(false);
                        }
                    } else {
                        console.log('loadUser - refresh failed, clearing tokens');
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                } else {
                    console.log('loadUser - no refresh token, clearing');
                    localStorage.removeItem('access_token');
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } else {
                console.log('loadUser - failed with status:', response.status);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = useCallback(async (email: string, password: string) => {
        console.log('login - attempting with:', email);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('login - response status:', response.status);

            if (response.ok && data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                console.log('Tokens saved successfully');
                await loadUser();
                return { data, error: null };
            } else {
                console.log('login - error:', data);
                return { data: null, error: data.detail || 'Ошибка входа' };
            }
        } catch (error: any) {
            console.error('Login error:', error);
            return { data: null, error: error.message || 'Ошибка сети' };
        }
    }, [loadUser]);

    const register = useCallback(async (data: RegisterRequest) => {
        console.log('register - attempting with:', data.email);

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const responseData = await response.json();
            console.log('register - response status:', response.status);

            if (response.ok) {
                if (responseData.access_token) {
                    localStorage.setItem('access_token', responseData.access_token);
                    localStorage.setItem('refresh_token', responseData.refresh_token);
                    console.log('Tokens saved after registration');
                    await loadUser();
                }
                return { data: responseData, error: null };
            } else {
                console.log('register - error:', responseData);
                return { data: null, error: responseData.detail || 'Ошибка регистрации' };
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            return { data: null, error: error.message || 'Ошибка сети' };
        }
    }, [loadUser]);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setIsAuthenticated(false);
        console.log('Logged out, tokens cleared');
    }, []);

    return {
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        loadUser,
    };
};