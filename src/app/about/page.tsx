'use client';

import React from 'react';
import Link from 'next/link';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { SectionHeading } from '@/components/marketing/SectionHeading';
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
  { icon: Bike, title: 'Rides', description: 'Boda boda and car trips booked from the app, with the fare shown before you accept.' },
  { icon: UtensilsCrossed, title: 'Food', description: 'Orders from restaurants and local eateries, tracked from the kitchen to your door.' },
  { icon: Package, title: 'Deliveries', description: 'Documents and parcels sent across town, with live tracking for both sender and receiver.' },
  { icon: ShoppingCart, title: 'Shopping', description: 'Groceries and household essentials from local stores you already buy from.' },
  { icon: HeartPulse, title: 'Pharmacy', description: 'Prescription and over-the-counter medicine from pharmacies licensed to dispense it.' },
  { icon: Wallet, title: 'Wallet', description: 'One balance, topped up from MTN MoMo or Airtel Money, spent across every service.' },
];

const riderBenefits = [
  'Work the hours you choose',
  'Weekly payouts to your mobile money',
  'Support reachable from inside the app',
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C0E] text-white">
      <MarketingHeader />

      <Section className="pb-16 pt-20 lg:pt-24">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00D97E]">
          About us
        </span>
        <h1 className="mt-5 max-w-3xl text-balance font-[family-name:var(--font-plus-jakarta)] text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
          A platform for how Kampala actually moves.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">
          A Ugandan app for getting around, getting fed, and getting things
          delivered. Built in Kampala by Natural Intellects Corp.
        </p>
      </Section>

      <Section tone="contrast" className="py-16">
        <div className="max-w-3xl space-y-6">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Why we built it</h2>
          <p className="text-lg leading-relaxed text-white/55">
            Getting across Kampala usually means negotiating a fare at the stage,
            hoping the rider knows the route, and carrying cash you would rather
            not carry. Ordering food, sending a parcel, or refilling a
            prescription each means a different app, a different account, and a
            different payment.
          </p>
          <p className="text-lg leading-relaxed text-white/55">
            Smart Ride puts those in one place. One account, one wallet you top
            up from MTN MoMo or Airtel Money, and riders whose documents we have
            checked before they take their first trip. We started with rides and
            added food, shopping, deliveries and pharmacy as the rider network
            grew enough to serve them properly.
          </p>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="What we offer"
          title="Six services, one account"
          subtitle="Every service shares the same wallet and the same support team."
        />

        <div className="mt-14 grid grid-cols-1 border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="border-b border-white/10 py-6 sm:even:border-l sm:even:pl-8 sm:odd:pr-8 lg:border-l lg:px-8 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0"
            >
              <div className="flex items-center gap-2.5">
                <service.icon className="h-4 w-4 shrink-0 text-[#00D97E]" />
                <h3 className="font-semibold text-white">{service.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="drivers" tone="contrast">
        <div className="rounded-2xl border border-white/10 p-8 md:p-14">
          <div className="max-w-2xl">
            <h2 className="mb-4 text-3xl font-semibold text-white">
              Ride with Smart Ride
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-white/60">
              If you already ride a boda or drive a car in Kampala, you can take
              Smart Ride jobs alongside your existing work. Submit your ID,
              licence and vehicle registration in the app, and you can start
              accepting requests once they clear verification.
            </p>

            <ul className="mb-8 space-y-3">
              {riderBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-white/70">
                  <Check className="h-5 w-5 shrink-0 text-[#00D97E]" />
                  {benefit}
                </li>
              ))}
            </ul>

            <a
              href={MOBILE_APP_CONFIG.storeLinks.playStore}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-[#0B0C0E] transition-colors hover:bg-white/90"
            >
              Download the app to apply
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Section>

      <MarketingFooter />
    </div>
  );
}
