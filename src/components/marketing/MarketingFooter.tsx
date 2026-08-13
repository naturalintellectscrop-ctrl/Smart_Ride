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
    <footer className="border-t border-mkt-border bg-mkt-bg">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src="/icon.png" alt="" fill className="object-cover" sizes="32px" />
              </div>
              <span className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold text-mkt-fg">
                Smart Ride
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-mkt-fg-muted">
              Rides, food, shopping, pharmacy and payments in one app. Built in
              Kampala by Natural Intellects Corp.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-mkt-fg-faint">
              <MapPin className="size-3.5" />
              Kampala, Uganda
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-mkt-fg-muted">
              Company
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-mkt-fg-muted transition-colors hover:text-mkt-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-mkt-fg-muted">
              Legal
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-mkt-fg-muted transition-colors hover:text-mkt-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-mkt-border pt-6">
          <p className="text-xs text-mkt-fg-faint">
            © {new Date().getFullYear()} Smart Ride, Natural Intellects Corp.
          </p>
        </div>
      </div>
    </footer>
  );
}
