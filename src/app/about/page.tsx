'use client';

import React from 'react';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { Reveal } from '@/components/marketing/Reveal';
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
    description: 'Boda boda and car trips booked from the app, with the fare shown before you accept.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food',
    description: 'Orders from restaurants and local eateries, tracked from the kitchen to your door.',
  },
  {
    icon: Package,
    title: 'Deliveries',
    description: 'Documents and parcels sent across town, with live tracking for both sender and receiver.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping',
    description: 'Groceries and household essentials from local stores you already buy from.',
  },
  {
    icon: HeartPulse,
    title: 'Pharmacy',
    description: 'Prescription and over-the-counter medicine from pharmacies licensed to dispense it.',
  },
  {
    icon: Wallet,
    title: 'Wallet',
    description: 'One balance, topped up from MTN MoMo or Airtel Money, spent across every service.',
  },
];

const riderBenefits = [
  'Work the hours you choose',
  'Weekly payouts to your mobile money',
  'Support reachable from inside the app',
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <MarketingHeader />

      <Section className="pb-16">
        <Reveal>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-mkt-fg sm:text-5xl">
            About Smart Ride
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mkt-fg-muted">
            A Ugandan app for getting around, getting fed, and getting things
            delivered. Built in Kampala by Natural Intellects Corp.
          </p>
        </Reveal>
      </Section>

      <Section containerClassName="[&>*]:max-w-3xl">
        <Reveal>
          <h2 className="mb-6 text-3xl font-bold text-mkt-fg">Why we built it</h2>
          <p className="mb-6 text-lg leading-relaxed text-mkt-fg-muted">
            Getting across Kampala usually means negotiating a fare at the stage,
            hoping the rider knows the route, and carrying cash you would rather
            not carry. Ordering food, sending a parcel, or refilling a
            prescription each means a different app, a different account, and a
            different payment.
          </p>
          <p className="text-lg leading-relaxed text-mkt-fg-muted">
            Smart Ride puts those in one place. One account, one wallet you top
            up from MTN MoMo or Airtel Money, and riders whose documents we have
            checked before they take their first trip. We started with rides and
            added food, shopping, deliveries and pharmacy as the rider network
            grew enough to serve them properly.
          </p>
        </Reveal>
      </Section>

      <Section tone="raised">
        <Reveal>
          <div className="mb-12 max-w-xl">
            <h2 className="mb-4 text-3xl font-bold text-mkt-fg">What we offer</h2>
            <p className="text-lg text-mkt-fg-muted">
              Six services sharing one account, one wallet, and one support team.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 border-t border-mkt-border sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.title} delay={(i % 3) * 0.06}>
              <div className="border-b border-mkt-border py-6 sm:even:border-l sm:even:pl-8 sm:odd:pr-8 lg:border-l lg:px-8 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0">
                <div className="flex items-center gap-2.5">
                  <service.icon className="h-4 w-4 shrink-0 text-mkt-accent" />
                  <h3 className="font-semibold text-mkt-fg">{service.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mkt-fg-muted">{service.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="drivers">
        <Reveal>
          <div className="rounded-3xl border border-mkt-border bg-mkt-bg-raised p-8 md:p-12">
            <div className="max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold text-mkt-fg">Ride with Smart Ride</h2>
              <p className="mb-8 text-lg text-mkt-fg-muted">
                If you already ride a boda or drive a car in Kampala, you can take
                Smart Ride jobs alongside your existing work. Submit your ID,
                licence and vehicle registration in the app, and you can start
                accepting requests once they clear verification.
              </p>

              <ul className="mb-8 space-y-3">
                {riderBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-mkt-fg-muted">
                    <Check className="h-5 w-5 shrink-0 text-mkt-accent" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <a
                href={MOBILE_APP_CONFIG.storeLinks.playStore}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-mkt-accent px-8 py-4 font-semibold text-mkt-accent-fg transition-opacity hover:opacity-90"
              >
                Download the app to apply
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </Reveal>
      </Section>

      <MarketingFooter />
    </MarketingShell>
  );
}
