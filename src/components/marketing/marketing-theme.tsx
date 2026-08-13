'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type MarketingTheme = 'light' | 'dark';

const STORAGE_KEY = 'smartride-marketing-theme';

const MarketingThemeContext = createContext<{
  theme: MarketingTheme;
  toggle: () => void;
} | null>(null);

export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<MarketingTheme>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <MarketingThemeContext.Provider value={{ theme, toggle }}>
      <div data-marketing={theme} className="bg-mkt-bg text-mkt-fg">
        {children}
      </div>
    </MarketingThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) {
    throw new Error('useMarketingTheme must be used within MarketingThemeProvider');
  }
  return ctx;
}
