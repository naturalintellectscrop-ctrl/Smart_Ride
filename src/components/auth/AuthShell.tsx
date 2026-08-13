import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AuthShellProps {
  title: string;
  subtitle: string;
  homeHref?: string;
  footerNote?: string;
  children: React.ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  homeHref = '/',
  footerNote = 'Smart Ride',
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0C0E] px-4 py-12 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center motion-safe:animate-[fadeIn_0.5s_ease-out]">
          <Link href={homeHref} className="inline-flex">
            <div className="h-14 w-14 overflow-hidden rounded-2xl">
              <Image
                src="/icon.png"
                alt="Smart Ride"
                width={56}
                height={56}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </Link>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111214] p-7 motion-safe:animate-[fadeIn_0.5s_ease-out_0.1s_backwards]">
          {children}
        </div>

        <div className="mt-6 text-center">
          <Link
            href={homeHref}
            className="text-sm text-white/40 transition-colors hover:text-white"
          >
            Back to Smart Ride
          </Link>
          <p className="mt-3 text-xs text-white/25">{footerNote}</p>
        </div>
      </div>
    </div>
  );
}
