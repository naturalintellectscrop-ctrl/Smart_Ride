'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
import {
  Bike,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  HeartPulse,
  Wallet,
  Check,
  ArrowRight,
} from 'lucide-react';

const services = [
  {
    icon: Bike,
    title: 'Rides',
    description:
      'Boda boda and car trips booked from the app, with the fare shown before you accept.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food',
    description:
      'Orders from restaurants and local eateries, tracked from the kitchen to your door.',
  },
  {
    icon: Package,
    title: 'Deliveries',
    description:
      'Documents and parcels sent across town, with live tracking for both sender and receiver.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping',
    description:
      'Groceries and household essentials from local stores you already buy from.',
  },
  {
    icon: HeartPulse,
    title: 'Pharmacy',
    description:
      'Prescription and over-the-counter medicine from pharmacies licensed to dispense it.',
  },
  {
    icon: Wallet,
    title: 'Wallet',
    description:
      'One balance, topped up from MTN MoMo or Airtel Money, spent across every service.',
  },
];

const riderBenefits = [
  'Work the hours you choose',
  'Weekly payouts to your mobile money',
  'Support reachable from inside the app',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0D0D12]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0D0D12]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo variant="dark" />

            <div className="hidden items-center gap-8 md:flex">
              <Link href="/about" className="text-sm font-medium text-[#00FF88]">About</Link>
              <Link href="/help" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Help</Link>
              <Link href="/contact" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Contact</Link>
              <Link href="/blog" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Blog</Link>
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

      <section className="px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            About Smart Ride
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
            A Ugandan app for getting around, getting fed, and getting things
            delivered. Built in Kampala by Natural Intellects Corp.
          </p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl [&>*]:max-w-3xl">
          <h2 className="mb-6 text-3xl font-bold text-white">Why we built it</h2>
          <p className="mb-6 text-lg leading-relaxed text-white/60">
            Getting across Kampala usually means negotiating a fare at the stage,
            hoping the rider knows the route, and carrying cash you would rather
            not carry. Ordering food, sending a parcel, or refilling a
            prescription each means a different app, a different account, and a
            different payment.
          </p>
          <p className="text-lg leading-relaxed text-white/60">
            Smart Ride puts those in one place. One account, one wallet you top
            up from MTN MoMo or Airtel Money, and riders whose documents we have
            checked before they take their first trip. We started with rides and
            added food, shopping, deliveries and pharmacy as the rider network
            grew enough to serve them properly.
          </p>
        </div>
      </section>

      <section className="bg-[#0A0A0F] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-xl">
            <h2 className="mb-4 text-3xl font-bold text-white">What we offer</h2>
            <p className="text-lg text-white/60">
              Six services sharing one account, one wallet, and one support team.
            </p>
          </div>

          <div className="grid grid-cols-1 border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="border-b border-white/10 py-6 sm:even:border-l sm:even:pl-8 sm:odd:pr-8 lg:border-l lg:px-8 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0"
              >
                <div className="flex items-center gap-2.5">
                  <service.icon className="h-4 w-4 shrink-0 text-[#00FF88]" />
                  <h3 className="font-semibold text-white">{service.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="drivers" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/5 bg-[#1A1A1F] p-8 md:p-12">
            <div className="max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Ride with Smart Ride
              </h2>
              <p className="mb-8 text-lg text-white/70">
                If you already ride a boda or drive a car in Kampala, you can take
                Smart Ride jobs alongside your existing work. Submit your ID,
                licence and vehicle registration in the app, and you can start
                accepting requests once they clear verification.
              </p>

              <ul className="mb-8 space-y-3">
                {riderBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-white/70">
                    <Check className="h-5 w-5 shrink-0 text-[#00FF88]" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <a
                href={MOBILE_APP_CONFIG.storeLinks.playStore}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#00FF88] px-8 py-4 font-semibold text-[#0D0D12] transition-colors hover:bg-[#00e07a]"
              >
                Download the app to apply
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#0A0A0F] px-4 py-16 sm:px-6 lg:px-8">
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
