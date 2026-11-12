import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  accent: string;
}

export const THEME_PRESETS: ThemeColors[] = [
  {
    id: 'blue',
    name: 'Biru (Default)',
    primary: '#1A73E8',
    primaryDark: '#1557B0',
    primaryLight: '#4285F4',
    primaryContainer: '#D3E3FD',
    onPrimaryContainer: '#041E49',
    secondary: '#00897B',
    secondaryContainer: '#B2DFDB',
    accent: '#EA4335',
  },
  {
    id: 'green',
    name: 'Hijau Segar',
    primary: '#2E7D32',
    primaryDark: '#1B5E20',
    primaryLight: '#4CAF50',
    primaryContainer: '#C8E6C9',
    onPrimaryContainer: '#1B5E20',
    secondary: '#00695C',
    secondaryContainer: '#B2DFDB',
    accent: '#FF6F00',
  },
  {
    id: 'purple',
    name: 'Ungu Elegan',
    primary: '#6A1B9A',
    primaryDark: '#4A148C',
    primaryLight: '#9C27B0',
    primaryContainer: '#E1BEE7',
    onPrimaryContainer: '#4A148C',
    secondary: '#1565C0',
    secondaryContainer: '#BBDEFB',
    accent: '#F44336',
  },
  {
    id: 'orange',
    name: 'Oranye Hangat',
    primary: '#E65100',
    primaryDark: '#BF360C',
    primaryLight: '#FF6D00',
    primaryContainer: '#FFE0B2',
    onPrimaryContainer: '#BF360C',
    secondary: '#4E342E',
    secondaryContainer: '#D7CCC8',
    accent: '#1976D2',
  },
  {
    id: 'teal',
    name: 'Teal Modern',
    primary: '#00695C',
    primaryDark: '#004D40',
    primaryLight: '#00897B',
    primaryContainer: '#B2DFDB',
    onPrimaryContainer: '#004D40',
    secondary: '#37474F',
    secondaryContainer: '#CFD8DC',
    accent: '#FF5722',
  },
  {
    id: 'red',
    name: 'Merah Berani',
    primary: '#C62828',
    primaryDark: '#B71C1C',
    primaryLight: '#E53935',
    primaryContainer: '#FFCDD2',
    onPrimaryContainer: '#B71C1C',
    secondary: '#283593',
    secondaryContainer: '#C5CAE9',
    accent: '#FF6F00',
  },
];

interface ThemeContextType {
  currentTheme: ThemeColors;
  setTheme: (themeId: string) => void;
  themes: ThemeColors[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(THEME_PRESETS[0]);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const themeId = await AsyncStorage.getItem('app_theme');
      if (themeId) {
        const theme = THEME_PRESETS.find(t => t.id === themeId);
        if (theme) setCurrentTheme(theme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }

  async function setTheme(themeId: string) {
    const theme = THEME_PRESETS.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      await AsyncStorage.setItem('app_theme', themeId);
    }
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
