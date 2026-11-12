import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../database/database';
import { User, UserRole } from '../types';
import { generateId, hashPassword } from '../utils/helpers';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  isOwner: () => boolean;
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
      const userData = await AsyncStorage.getItem('current_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDatabase();
      const hashedPassword = hashPassword(password);

      const result = await db.getFirstAsync<User>(
        'SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1',
        [username, hashedPassword]
      );

      if (result) {
        setUser(result);
        await AsyncStorage.setItem('current_user', JSON.stringify(result));
        return { success: true, message: 'Login berhasil' };
      }

      return { success: false, message: 'Username atau password salah' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    }
  }

  async function register(
    username: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDatabase();

      // Check if username exists
      const existing = await db.getFirstAsync(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existing) {
        return { success: false, message: 'Username sudah digunakan' };
      }

      const id = generateId();
      const hashedPassword = hashPassword(password);

      await db.runAsync(
        'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
        [id, username, hashedPassword, name, role]
      );

      return { success: true, message: 'Registrasi berhasil' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Terjadi kesalahan saat registrasi' };
    }
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem('current_user');
  }

  function isOwner(): boolean {
    return user?.role === 'owner';
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, isOwner }}>
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
