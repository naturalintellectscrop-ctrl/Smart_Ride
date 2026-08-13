import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-xl', className)}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mkt-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-mkt-fg sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-mkt-fg-muted">{subtitle}</p>}
    </div>
  );
}
