import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { RegisterInput, MeResponse } from '@fashion/shared';
import { api } from '../services/api';
import { getToken, clearToken, clearRefreshToken } from '../services/storage';

interface AuthContextValue {
  user: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const token = await getToken();
        if (!token) return;

        const userData = await api.getMe();
        if (mounted) setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
        // Clear stale tokens so next launch doesn't hang again
        await clearToken();
        await clearRefreshToken();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login({ email, password });
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterInput) => {
    const response = await api.register(data);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
