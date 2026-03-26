import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../api/auth';
import { User } from '../api/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      
      // Сохраняем данные
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Обновляем состояние
      setToken(data.access_token);
      setUser(data.user);
      
      // ✅ ИСПРАВЛЕНО: редирект происходит ПОСЛЕ сохранения
      // Используем setTimeout чтобы дать React обновить состояние
      setTimeout(() => {
        switch (data.user.role) {
          case 'student':
            window.location.href = '/student/recommendations';
            break;
          case 'company':
            window.location.href = '/company/dashboard';
            break;
          case 'curator':
            window.location.href = '/curator/dashboard';
            break;
          default:
            window.location.href = '/';
        }
      }, 100);
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      await authAPI.register(email, password, fullName);
      // ✅ После регистрации НЕ делаем автологин, показываем сообщение о письме
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};