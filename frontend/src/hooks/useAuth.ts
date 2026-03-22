import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { UserRole, UserResponse } from '../api/types';

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  display_name: string;
  role: UserRole;
  company_name?: string;
  inn?: string;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,
    refreshToken: null,
  });

  // Инициализация: проверяем сохранённые токены
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (accessToken && refreshToken) {
        setState(prev => ({ ...prev, accessToken, refreshToken, isLoading: true }));
        
        try {
          const user = await authApi.getCurrentUser();
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            accessToken,
            refreshToken,
          });
        } catch (error) {
          // Токен невалидный, пробуем обновить
          try {
            const response = await authApi.refreshToken(refreshToken);
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            
            const user = await authApi.getCurrentUser();
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
              accessToken: response.access_token,
              refreshToken: response.refresh_token,
            });
          } catch (refreshError) {
            // Обновление не удалось, очищаем
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              accessToken: null,
              refreshToken: null,
            });
          }
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  // Логин
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await authApi.login(email, password);
      
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      const user = await authApi.getCurrentUser();
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });
      
      return response;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Регистрация
  const register = useCallback(async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await authApi.register(data);
      
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      const user = await authApi.getCurrentUser();
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });
      
      return response;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Логаут
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
    });
  }, []);

  // Обновление токена
  const refreshToken = useCallback(async () => {
    if (!state.refreshToken) return null;
    
    try {
      const response = await authApi.refreshToken(state.refreshToken);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      setState(prev => ({
        ...prev,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      }));
      
      return response;
    } catch (error) {
      logout();
      return null;
    }
  }, [state.refreshToken, logout]);

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    login,
    register,
    logout,
    refreshToken,
  };
};