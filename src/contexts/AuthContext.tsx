import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { authApi, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  isOwner: () => boolean;
  isKasir: () => boolean;
  canManageProducts: () => boolean;
  canCreateTransactions: () => boolean;
  canExportData: () => boolean;
  canAccessStoreSettings: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await getAuthToken();
      const userData = await AsyncStorage.getItem('current_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      if (token) {
        const res = await authApi.getMe();
        const me = res.user || res.data;
        if (res.success && me) {
          setUser(me);
          await AsyncStorage.setItem('current_user', JSON.stringify(me));
        } else if (!res.success) {
          // Token expired atau tidak valid
          await removeAuthToken();
          await AsyncStorage.removeItem('current_user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await authApi.login(username.trim(), password);

      if (res.success && res.token && res.user) {
        setUser(res.user);
        await setAuthToken(res.token);
        await AsyncStorage.setItem('current_user', JSON.stringify(res.user));
        return { success: true, message: 'Login berhasil' };
      }

      return { success: false, message: res.message || 'Username atau password salah' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: error?.message || 'Terjadi kesalahan saat login' };
    }
  }

  async function register(
    username: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await authApi.register(username.trim(), password, name.trim(), role);

      if (res.success) {
        const registeredUser = res.user || res.data;
        if (res.token && registeredUser) {
          setUser(registeredUser);
          await setAuthToken(res.token);
          await AsyncStorage.setItem('current_user', JSON.stringify(registeredUser));
        }
        return { success: true, message: res.message || 'Registrasi berhasil' };
      }

      return { success: false, message: res.message || 'Terjadi kesalahan saat registrasi' };
    } catch (error: any) {
      console.error('Register error:', error);
      return { success: false, message: error?.message || 'Terjadi kesalahan saat registrasi' };
    }
  }

  async function logout() {
    setUser(null);
    await removeAuthToken();
    await AsyncStorage.removeItem('current_user');
  }

  function isOwner(): boolean {
    return user?.role === 'owner';
  }

  function isKasir(): boolean {
    return user?.role === 'kasir';
  }

  function canManageProducts(): boolean {
    return user?.role === 'owner' && user?.is_active === 1;
  }

  function canCreateTransactions(): boolean {
    return !!user && user.is_active === 1;
  }

  function canExportData(): boolean {
    return user?.role === 'owner' && user?.is_active === 1;
  }

  function canAccessStoreSettings(): boolean {
    return user?.role === 'owner' && user?.is_active === 1;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isOwner,
        isKasir,
        canManageProducts,
        canCreateTransactions,
        canExportData,
        canAccessStoreSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
