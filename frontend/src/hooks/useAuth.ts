// frontend/src/hooks/useAuth.ts
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
    telegram: string | null;
    profile_privacy?: 'public' | 'contacts_only' | 'private';
    resume_privacy?: 'public' | 'contacts_only' | 'private';
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

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: UserResponse;
}

export const useAuth = () => {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Загрузка пользователя из localStorage при инициализации
    const loadUserFromStorage = useCallback(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setIsAuthenticated(true);
                console.log('User loaded from storage:', parsedUser.email, 'role:', parsedUser.role);
            } catch (e) {
                console.error('Error parsing stored user:', e);
                localStorage.removeItem('user');
            }
        }
    }, []);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        console.log('loadUser - token exists:', !!token);

        if (!token) {
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

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
                console.log('loadUser - user loaded:', data.email, 'role:', data.role);
                setUser(data);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(data));
            } else if (response.status === 401) {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    console.log('loadUser - trying to refresh token...');
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        const newToken = localStorage.getItem('access_token');
                        if (newToken) {
                            const retryResponse = await fetch('/users/me', {
                                headers: {
                                    'Authorization': `Bearer ${newToken}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                            if (retryResponse.ok) {
                                const retryData = await retryResponse.json();
                                console.log('loadUser - user loaded after refresh:', retryData.email, 'role:', retryData.role);
                                setUser(retryData);
                                setIsAuthenticated(true);
                                localStorage.setItem('user', JSON.stringify(retryData));
                                setLoading(false);
                                return;
                            }
                        }
                    }
                }
                // Если не удалось обновить, очищаем всё
                clearAuthData();
                setUser(null);
                setIsAuthenticated(false);
            } else {
                console.log('loadUser - failed with status:', response.status);
                const errorData = await response.json().catch(() => null);
                setError(errorData?.detail || 'Ошибка загрузки профиля');
                clearAuthData();
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            setError('Ошибка сети при загрузке профиля');
            clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshAccessToken = useCallback(async (): Promise<boolean> => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;

        try {
            const response = await fetch('/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                }
                console.log('Token refreshed successfully');
                return true;
            }
            console.log('Token refresh failed');
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }, []);

    const clearAuthData = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }, []);

    // Обновление данных пользователя
    const updateUser = useCallback((userData: UserResponse) => {
        console.log('updateUser - updating user data:', userData.email);
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);

    // Частичное обновление пользователя (после изменения профиля)
    const updateUserPartial = useCallback((updates: Partial<UserResponse>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updates };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<{ data: LoginResponse | null; error: string | null }> => {
        console.log('login - attempting with:', email);
        setError(null);

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
                if (data.user) {
                    console.log('login - user role:', data.user.role);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                    setIsAuthenticated(true);
                } else {
                    await loadUser();
                }
                console.log('Login successful');
                return { data, error: null };
            } else {
                const errorMsg = data.detail || 'Неверный email или пароль';
                setError(errorMsg);
                return { data: null, error: errorMsg };
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const errorMsg = error.message || 'Ошибка сети';
            setError(errorMsg);
            return { data: null, error: errorMsg };
        }
    }, [loadUser]);

    const register = useCallback(async (data: RegisterRequest): Promise<{ data: any; error: string | null }> => {
        console.log('register - attempting with:', data.email);
        setError(null);

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
                    if (responseData.user) {
                        localStorage.setItem('user', JSON.stringify(responseData.user));
                        setUser(responseData.user);
                        setIsAuthenticated(true);
                    } else {
                        await loadUser();
                    }
                }
                return { data: responseData, error: null };
            } else {
                const errorMsg = responseData.detail || 'Ошибка регистрации';
                setError(errorMsg);
                return { data: null, error: errorMsg };
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            const errorMsg = error.message || 'Ошибка сети';
            setError(errorMsg);
            return { data: null, error: errorMsg };
        }
    }, [loadUser]);

    const logout = useCallback(() => {
        clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        console.log('Logged out, all data cleared');
    }, [clearAuthData]);

    // Проверка, является ли пользователь студентом
    const isStudent = useCallback(() => {
        return user?.role === 'student';
    }, [user]);

    // Проверка, является ли пользователь компанией
    const isCompany = useCallback(() => {
        return user?.role === 'company';
    }, [user]);

    // Проверка, является ли пользователь куратором
    const isCurator = useCallback(() => {
        return user?.role === 'curator' || user?.role === 'admin';
    }, [user]);

    // Проверка, является ли пользователь администратором
    const isAdmin = useCallback(() => {
        return user?.role === 'admin';
    }, [user]);

    // Получение полного имени пользователя
    const getFullName = useCallback(() => {
        if (!user) return '';
        return `${user.first_name} ${user.last_name}`;
    }, [user]);

    // Получение отображаемого имени
    const getDisplayName = useCallback(() => {
        if (!user) return '';
        return user.display_name || `${user.first_name} ${user.last_name}`;
    }, [user]);

    // Получение дашборда по роли
    const getDashboardPath = useCallback(() => {
        if (!user) return '/';
        switch (user.role) {
            case 'student':
                return '/student';
            case 'company':
                return '/company';
            case 'curator':
            case 'admin':
                return '/curator';
            default:
                return '/';
        }
    }, [user]);

    // Проверка доступа к маршруту
    const canAccessRoute = useCallback((path: string): boolean => {
        if (!user) return false;
        
        // Студенческие маршруты
        if (path.startsWith('/student')) {
            return user.role === 'student';
        }
        // Маршруты компании
        if (path.startsWith('/company')) {
            return user.role === 'company';
        }
        // Маршруты куратора
        if (path.startsWith('/curator')) {
            return user.role === 'curator' || user.role === 'admin';
        }
        return true;
    }, [user]);

    // Загрузка пользователя при монтировании и из localStorage
    useEffect(() => {
        loadUserFromStorage();
        // Проверяем актуальность токена при загрузке
        if (localStorage.getItem('access_token')) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, [loadUserFromStorage, loadUser]);

    return {
        user,
        isAuthenticated,
        loading,
        error,
        login,
        register,
        logout,
        loadUser,
        updateUser,
        updateUserPartial,
        refreshAccessToken,
        isStudent,
        isCompany,
        isCurator,
        isAdmin,
        getFullName,
        getDisplayName,
        getDashboardPath,
        canAccessRoute,
        clearAuthData,
    };
};