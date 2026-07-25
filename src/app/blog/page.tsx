'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
import { Bookmark } from 'lucide-react';

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D12]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0D0D12]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo variant="dark" />

            <div className="hidden items-center gap-8 md:flex">
              <Link href="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-white">About</Link>
              <Link href="/help" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Help</Link>
              <Link href="/contact" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Contact</Link>
              <Link href="/blog" className="text-sm font-medium text-[#00FF88]">Blog</Link>
            </div>

            <a
              href={MOBILE_APP_CONFIG.storeLinks.playStore}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#00FF88] px-5 py-2.5 text-sm font-semibold text-[#0D0D12] transition-colors hover:bg-[#00e07a]"
            >
              Get the app
            </a>
          </div>
        </div>
      </nav>

      <section className="px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Blog
          </h1>
          <p className="mt-6 text-lg text-white/60">
            Product updates, safety notes, and what we are working on.
          </p>

          <div className="mt-12 rounded-2xl border border-dashed border-white/15 bg-white/5 p-12">
            <Bookmark className="mx-auto mb-3 h-8 w-8 text-[#00FF88]/50" />
            <p className="text-lg font-medium text-white">No posts yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              We have not published anything here yet. Until we do, the fastest
              way to hear from us is the in-app notifications or by writing to
              our support team.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[#00FF88]/40 hover:text-[#00FF88]"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-white/5 bg-[#0A0A0F] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="col-span-1 md:col-span-2">
              <Logo variant="dark" />
              <p className="mt-6 max-w-md leading-relaxed text-white/50">
                Rides, food, shopping, pharmacy and payments in one app. Built in
                Kampala by Natural Intellects Corp.
              </p>
            </div>

            <div>
              <h4 className="mb-6 font-semibold text-white">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-white/50 transition-colors hover:text-[#00FF88]">About</Link></li>
                <li><Link href="/help" className="text-white/50 transition-colors hover:text-[#00FF88]">Help centre</Link></li>
                <li><Link href="/contact" className="text-white/50 transition-colors hover:text-[#00FF88]">Contact</Link></li>
                <li><Link href="/blog" className="text-white/50 transition-colors hover:text-[#00FF88]">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 font-semibold text-white">Contact</h4>
              <ul className="space-y-4">
                <li className="text-white/50">
                  <span className="text-white">Email:</span>{' '}
                  <a href="mailto:support@smartride.ug" className="transition-colors hover:text-[#00FF88]">support@smartride.ug</a>
                </li>
                <li className="text-white/50">
                  <span className="text-white">Phone:</span>{' '}
                  <a href="tel:+256785710818" className="transition-colors hover:text-[#00FF88]">+256 785 710 818</a>
                </li>
                <li className="text-white/50">
                  <span className="text-white">Location:</span> Kampala, Uganda
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8">
            <p className="text-sm text-white/30">
              © {new Date().getFullYear()} Smart Ride, Natural Intellects Corp.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
