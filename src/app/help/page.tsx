'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ShieldCheck, MapPin, Headphones, ArrowRight } from 'lucide-react';

const faqData = [
  {
    question: 'How do I book a ride?',
    answer:
      "Open the app, enter your destination, choose boda or car, and tap Request. You'll see the fare before you confirm, and a nearby rider is matched to you.",
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'MTN Mobile Money, Airtel Money, and cash to the rider. You can also top up your Smart Ride wallet once and spend it across rides, food, shopping and pharmacy.',
  },
  {
    question: 'How do I track my ride?',
    answer:
      "Once a rider accepts, you'll see their location on the map, along with their name, photo and vehicle details. You can call or message them from inside the app.",
  },
  {
    question: 'Can I schedule a ride in advance?',
    answer:
      'Yes, up to 7 days ahead. Tap the clock icon on the booking screen and pick your pickup date and time.',
  },
  {
    question: 'How do I cancel a ride?',
    answer:
      'Tap Cancel Ride in the app. A cancellation fee may apply if your rider has already set off towards your pickup point.',
  },
  {
    question: 'How do I become a rider or driver?',
    answer:
      'Download the app, create an account, and submit your ID, licence and vehicle registration. Once those clear verification you can start accepting requests.',
  },
  {
    question: 'Is my personal information secure?',
    answer:
      'Your account details and payment information are encrypted in transit and at rest. We do not sell your data or share it with third parties for marketing. See our privacy policy for what we collect and why.',
  },
  {
    question: 'What if I left something in a ride?',
    answer:
      "Go to Your Rides, select the trip, and tap 'I lost an item'. You can contact the rider directly, or hand it to our support team if you cannot reach them.",
  },
  {
    question: 'How do I contact support?',
    answer:
      'In the app, go to Help then Contact Support. That route gives us your trip details automatically. You can also email support@smartride.ug.',
  },
];

const safetyFeatures = [
  { icon: ShieldCheck, title: 'Verified riders', description: 'Every rider submits an ID, a licence and vehicle registration, and we check them before their first trip.' },
  { icon: MapPin, title: 'Live trip sharing', description: 'Share your trip with someone you trust and they can follow your location until you arrive.' },
  { icon: Headphones, title: 'SOS button', description: 'One tap alerts our support team and shares your live location with your emergency contacts.' },
];

const paymentOptions = [
  { label: 'MTN', name: 'MTN MoMo', description: 'Pay straight from your MTN Mobile Money account', swatch: '#FFCC00', text: '#0B0C0E' },
  { label: 'A', name: 'Airtel Money', description: 'Pay from your Airtel Money wallet', swatch: '#ED1C24', text: '#FFFFFF' },
  { label: 'UGX', name: 'Cash', description: 'Pay the rider in cash at the end of your trip', swatch: '#00D97E', text: '#0B0C0E' },
];

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C0E] text-white">
      <MarketingHeader />

      <Section className="pb-12 pt-20 lg:pt-24">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00D97E]">
          Help centre
        </span>
        <h1 className="mt-5 text-balance font-[family-name:var(--font-plus-jakarta)] text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
          Answers to what people ask most
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">
          If yours isn&apos;t here, our support team can pick it up from the app.
        </p>
      </Section>

      <Section className="pt-4">
        <div className="max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold text-white">Frequently asked questions</h2>
          <Accordion type="single" collapsible defaultValue={faqData[0].question} className="border-t border-white/10">
            {faqData.map((item) => (
              <AccordionItem key={item.question} value={item.question} className="border-white/10">
                <AccordionTrigger className="py-5 text-base font-medium text-white hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-white/55">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      <Section tone="contrast">
        <SectionHeading eyebrow="Safety" title="Staying safe" />
        <div className="mt-12 grid grid-cols-1 border-t border-white/10 md:grid-cols-3">
          {safetyFeatures.map((feature) => (
            <div
              key={feature.title}
              className="border-b border-white/10 py-6 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
            >
              <div className="flex items-center gap-2.5">
                <feature.icon className="h-4 w-4 shrink-0 text-[#00D97E]" />
                <h3 className="font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Payments" title="Ways to pay" />
        <dl className="mt-12 max-w-3xl divide-y divide-white/10 border-t border-white/10">
          {paymentOptions.map((option) => (
            <div key={option.name} className="flex items-center gap-5 py-5">
              <span
                className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md text-sm font-bold"
                style={{ backgroundColor: option.swatch, color: option.text }}
              >
                {option.label}
              </span>
              <div>
                <dt className="font-semibold text-white">{option.name}</dt>
                <dd className="text-sm text-white/45">{option.description}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="contrast">
        <h2 className="mb-4 text-3xl font-semibold text-white">Still stuck?</h2>
        <p className="mb-8 max-w-2xl text-white/55">
          For a problem with a trip that is happening now, use in-app support.
          It reaches us with your trip details attached.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-[#0B0C0E] transition-colors hover:bg-white/90"
          >
            Contact support
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:support@smartride.ug"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/5"
          >
            Email us
          </a>
        </div>
      </Section>

      <MarketingFooter />
    </div>
  );
}
