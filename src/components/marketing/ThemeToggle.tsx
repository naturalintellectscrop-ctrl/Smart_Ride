'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useMarketingTheme } from './marketing-theme';

export function ThemeToggle() {
  const { theme, toggle } = useMarketingTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-mkt-border text-mkt-fg-muted transition-colors hover:text-mkt-fg"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
