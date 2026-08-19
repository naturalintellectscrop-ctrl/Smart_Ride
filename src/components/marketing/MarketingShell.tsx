'use client';

import React from 'react';
import { MarketingThemeProvider } from './marketing-theme';
import { ScrollProgressBar } from './ScrollProgressBar';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <MarketingThemeProvider>
      <ScrollProgressBar />
      <div className="flex min-h-screen flex-col font-sans">{children}</div>
    </MarketingThemeProvider>
  );
}
