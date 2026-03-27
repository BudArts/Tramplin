// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth as useAuthHook, UserResponse } from '../hooks/useAuth';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: any) => Promise<{ error?: string }>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (userData: Partial<UserResponse>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthHook();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    setToken(storedToken);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await auth.login(email, password);
    if (result.data) {
      setToken(result.data.access_token);
    }
    return { error: result.error || undefined };
  };

  const register = async (data: any) => {
    const result = await auth.register(data);
    if (result.data && result.data.access_token) {
      setToken(result.data.access_token);
    }
    return { error: result.error || undefined };
  };

  const logout = () => {
    auth.logout();
    setToken(null);
  };

  const loadUser = async () => {
    await auth.loadUser();
  };

  const updateUser = (userData: Partial<UserResponse>) => {
    auth.updateUserPartial(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        token,
        isAuthenticated: auth.isAuthenticated,
        loading: auth.loading,
        login,
        register,
        logout,
        loadUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};