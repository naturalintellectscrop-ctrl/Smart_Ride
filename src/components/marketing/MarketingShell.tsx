'use client';

import React from 'react';
import { MarketingThemeProvider } from './marketing-theme';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <MarketingThemeProvider>
      <div className="flex min-h-screen flex-col font-sans">{children}</div>
    </MarketingThemeProvider>
  );
}
