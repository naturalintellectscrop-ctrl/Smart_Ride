'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { Reveal } from '@/components/marketing/Reveal';
import { Bookmark } from 'lucide-react';

export default function BlogPage() {
  return (
    <MarketingShell>
      <MarketingHeader />

      <Section className="pb-24" containerClassName="mx-auto max-w-3xl text-center">
        <Reveal>
          <h1 className="text-4xl font-bold leading-tight text-mkt-fg sm:text-5xl">Blog</h1>
          <p className="mt-6 text-lg text-mkt-fg-muted">
            Product updates, safety notes, and what we are working on.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 rounded-2xl border border-dashed border-mkt-border bg-mkt-bg-raised p-12">
            <Bookmark className="mx-auto mb-3 h-8 w-8 text-mkt-accent/50" />
            <p className="text-lg font-medium text-mkt-fg">No posts yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-mkt-fg-muted">
              We have not published anything here yet. Until we do, the fastest
              way to hear from us is the in-app notifications or by writing to
              our support team.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex rounded-xl border border-mkt-border px-6 py-3 text-sm font-semibold text-mkt-fg transition-colors hover:border-mkt-accent/40 hover:text-mkt-accent"
            >
              Contact us
            </Link>
          </div>
        </Reveal>
      </Section>

      <MarketingFooter />
    </MarketingShell>
  );
}
