import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { UserResponse, RegisterRequest, TokenResponse } from '../api/types';

export const useAuth = () => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.users.me();
      if (response.data) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    if (response.data) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      const userResponse = await api.users.me();
      if (userResponse.data) {
        setUser(userResponse.data);
        setIsAuthenticated(true);
      }
    }
    return response;
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await api.auth.register(data);
    if (response.data) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      const userResponse = await api.users.me();
      if (userResponse.data) {
        setUser(userResponse.data);
        setIsAuthenticated(true);
      }
    }
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };
};