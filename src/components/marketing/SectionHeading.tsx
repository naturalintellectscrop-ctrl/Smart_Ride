import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  size?: 'default' | 'large';
  className?: string;
  titleClassName?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  size = 'default',
  className,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00D97E]">
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'mt-4 text-balance font-[family-name:var(--font-plus-jakarta)] font-semibold tracking-tight text-white',
          size === 'large'
            ? 'text-4xl sm:text-5xl lg:text-6xl leading-[1.05]'
            : 'text-3xl sm:text-4xl leading-[1.1]',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-pretty text-base leading-relaxed text-white/55 sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}
