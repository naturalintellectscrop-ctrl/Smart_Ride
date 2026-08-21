'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/use-active-section';

export interface TocSection {
  id: string;
  label: string;
}

interface PageTocProps {
  sections: TocSection[];
  className?: string;
}

/**
 * Scroll-aware table of contents: the same card/link-grid pattern the
 * legal pages already use, now highlighting whichever section is in view
 * as you scroll instead of sitting static.
 */
export function PageToc({ sections, className }: PageTocProps) {
  const activeId = useActiveSection(sections.map((s) => s.id));

  return (
    <div className={cn('mb-12 rounded-2xl border border-mkt-border bg-mkt-bg-raised p-6', className)}>
      <h2 className="mb-4 text-lg font-semibold text-mkt-fg">Table of Contents</h2>
      <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sections.map((section, index) => {
          const active = section.id === activeId;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                'flex items-center gap-2 rounded-md py-1 text-sm transition-colors duration-200',
                active ? 'text-mkt-accent' : 'text-mkt-fg-muted hover:text-mkt-accent',
              )}
            >
              <span
                className={cn(
                  'w-5 shrink-0 font-mono text-xs',
                  active ? 'text-mkt-accent' : 'text-mkt-accent/60',
                )}
              >
                {index + 1}.
              </span>
              {section.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
