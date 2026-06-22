// ============================================
// SMART RIDE MOBILE - THEME CONTEXT
// ============================================
// Provides light/dark theme switching with persistence.
// Default: light mode (matches userInterfaceStyle in app.json).
// Persists choice via AsyncStorage.
// New code should use useTheme().colors instead of COLORS.
// Brand color is green (#005f3a) — NO blue anywhere.
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// COLOR PALETTES
// ============================================

export const DarkColors = {
  // Primary — brand green, brightened for dark backgrounds
  primary: '#7cd9a4',
  primaryLight: '#98f6be',
  primaryDark: '#0e7a4d',
  // Secondary — deeper green (NOT blue)
  secondary: '#4ae176',
  secondaryLight: '#6bff8f',
  secondaryDark: '#006e2f',
  background: '#191c1d',
  backgroundElevated: '#2e3132',
  backgroundSurface: '#3f4941',
  backgroundSecondary: '#2e3132',
  text: '#f0f1f2',
  textSecondary: 'rgba(240, 241, 242, 0.7)',
  textMuted: 'rgba(240, 241, 242, 0.5)',
  textDisabled: 'rgba(240, 241, 242, 0.3)',
  border: 'rgba(240, 241, 242, 0.12)',
  borderLight: 'rgba(240, 241, 242, 0.06)',
  borderStrong: 'rgba(240, 241, 242, 0.2)',
  success: '#4ae176',
  error: '#f2b8b5',
  warning: '#f9cd8e',
  info: '#7cd9a4',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  textDim: 'rgba(240, 241, 242, 0.3)',
  accent: '#f9cd8e',
  // Glass
  glassBackground: 'rgba(30, 49, 50, 0.7)',
  glassBorder: 'rgba(124, 217, 164, 0.12)',
  glassShadow: 'rgba(0, 0, 0, 0.4)',
  glassElevated: 'rgba(46, 49, 50, 0.85)',
};

export const LightColors = {
  // Primary — brand green
  primary: '#005f3a',
  primaryLight: '#0e7a4d',
  primaryDark: '#00522f',
  // Secondary — deeper green (NOT blue — Smart Ride is a green brand)
  secondary: '#006e2f',
  secondaryLight: '#4ae176',
  secondaryDark: '#005321',
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
  success: '#006e2f',
  error: '#ba1a1a',
  warning: '#F59E0B',
  info: '#0e7a4d',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  textDim: 'rgba(25, 28, 29, 0.3)',
  accent: '#0e7a4d',
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

// Storage key bumped to _v2 to invalidate any previously-saved 'dark'
// preference that used the OLD broken palette (neon green #00FF88 + blue
// #3B82F6). Users who had that saved will get reset to the default 'light'
// theme, which matches the Stitch MD3 palette and app.json userInterfaceStyle.
const THEME_STORAGE_KEY = 'smart_ride_theme_v2';
const LEGACY_THEME_KEY = 'smart_ride_theme';

// ============================================
// PROVIDER
// ============================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isReady, setIsReady] = useState(false);

  // Load saved theme on mount + migrate from legacy key
  useEffect(() => {
    (async () => {
      try {
        // Migrate: clear the legacy key if it exists. The old key may have
        // stored 'dark' with the broken neon-green/blue palette, so we
        // intentionally do NOT restore its value — start fresh with 'light'.
        const legacy = await AsyncStorage.getItem(LEGACY_THEME_KEY);
        if (legacy !== null) {
          await AsyncStorage.removeItem(LEGACY_THEME_KEY);
          console.log('[ThemeProvider] Cleared legacy theme key');
        }

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
