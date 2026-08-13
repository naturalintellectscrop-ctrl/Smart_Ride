import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  tone?: 'default' | 'raised';
  children: React.ReactNode;
  containerClassName?: string;
}

export function Section({
  id,
  tone = 'default',
  children,
  className,
  containerClassName,
  ...props
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn('py-20 sm:py-24', tone === 'raised' && 'bg-mkt-bg-raised', className)}
      {...props}
    >
      <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  );
}
