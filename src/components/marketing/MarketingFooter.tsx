import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

const footerLinks = {
  company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Help centre', href: '/help' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Terms of service', href: '/terms' },
    { label: 'Delete account', href: '/delete-account' },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0C0E]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src="/icon.png" alt="" fill className="object-cover" sizes="32px" />
              </div>
              <span className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold text-white">
                Smart Ride
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/50">
              Rides, food, shopping, pharmacy and payments in one app. Built in
              Kampala by Natural Intellects Corp.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-white/35">
              <MapPin className="size-3.5" />
              Kampala, Uganda
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
              Company
            </h4>
            <ul className="mt-5 space-y-3">
              {footerLinks.company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
              Legal
            </h4>
            <ul className="mt-5 space-y-3">
              {footerLinks.legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} Smart Ride, Natural Intellects Corp.
          </p>
        </div>
      </div>
    </footer>
  );
}
