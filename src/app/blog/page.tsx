'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { Bookmark } from 'lucide-react';

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C0E] text-white">
      <MarketingHeader />

      <Section className="py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00D97E]">
            Blog
          </span>
          <h1 className="mt-5 text-balance font-[family-name:var(--font-plus-jakarta)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Product updates and safety notes
          </h1>
          <p className="mt-5 text-lg text-white/55">
            What we are working on, told plainly.
          </p>

          <div className="mt-14 rounded-2xl border border-white/10 p-12">
            <Bookmark className="mx-auto mb-4 h-6 w-6 text-white/30" />
            <p className="text-lg font-medium text-white">No posts yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/50">
              We have not published anything here yet. Until we do, the fastest
              way to hear from us is in-app notifications or by writing to our
              support team.
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Contact us
            </Link>
          </div>
        </div>
      </Section>

      <MarketingFooter />
    </div>
  );
}
