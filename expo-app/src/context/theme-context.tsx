// ============================================
// SMART RIDE MOBILE - THEME CONTEXT
// ============================================
// Provides light/dark theme switching with persistence.
// Default: dark mode. Persists choice via AsyncStorage.
// New code should use useTheme().colors instead of COLORS.
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// COLOR PALETTES
// ============================================

export const DarkColors = {
  primary: '#00FF88',
  primaryLight: '#10B981',
  primaryDark: '#059669',
  secondary: '#3B82F6',
  secondaryLight: '#60A5FA',
  secondaryDark: '#1D4ED8',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundSurface: '#252530',
  backgroundSecondary: '#1A1A24',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  success: '#00FF88',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  textDim: 'rgba(255, 255, 255, 0.3)',
  accent: '#F59E0B',
  // Glass
  glassBackground: 'rgba(19, 19, 26, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.05)',
  glassShadow: 'rgba(0, 0, 0, 0.3)',
  glassElevated: 'rgba(30, 30, 40, 0.8)',
};

export const LightColors = {
  primary: '#005f3a',
  primaryLight: '#0e7a4d',
  primaryDark: '#00522f',
  secondary: '#3B82F6',
  secondaryLight: '#60A5FA',
  secondaryDark: '#1D4ED8',
  background: '#f8f9fa',
  backgroundElevated: '#ffffff',
  backgroundSurface: '#f3f4f5',
  backgroundSecondary: '#edeeef',
  text: '#191c1d',
  textSecondary: 'rgba(25, 28, 29, 0.7)',
  textMuted: '#6f7a71',
  textDisabled: 'rgba(25, 28, 29, 0.3)',
  border: '#bec9bf',
  borderLight: '#d9dadb',
  borderStrong: '#6f7a71',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  textDim: 'rgba(25, 28, 29, 0.3)',
  accent: '#F59E0B',
  // Glass - light mode
  glassBackground: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 95, 58, 0.08)',
  glassShadow: 'rgba(0, 0, 0, 0.08)',
  glassElevated: 'rgba(255, 255, 255, 0.9)',
};

// ============================================
// TYPES
// ============================================

export type ThemeColors = typeof DarkColors;
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  /** Current theme mode */
  theme: ThemeMode;
  /** Whether the current theme is dark */
  isDark: boolean;
  /** Current theme colors object */
  colors: ThemeColors;
  /** Set theme to a specific mode */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between light and dark themes */
  toggleTheme: () => void;
}

// ============================================
// CONTEXT
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'smart_ride_theme';

// ============================================
// PROVIDER
// ============================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isReady, setIsReady] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    (async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch (e) {
        console.warn('[ThemeProvider] Failed to load theme from storage:', e);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const isDark = theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('[ThemeProvider] Failed to save theme to storage:', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  // Don't render children until we've loaded the saved theme
  // to avoid flash of wrong theme
  if (!isReady) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
