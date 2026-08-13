import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  tone?: 'default' | 'contrast';
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
      className={cn(
        'py-24 sm:py-32',
        tone === 'contrast' && 'bg-[#111214]',
        className,
      )}
      {...props}
    >
      <div className={cn('mx-auto max-w-7xl px-6 lg:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  );
}
