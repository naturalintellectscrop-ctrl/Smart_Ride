'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
import { ChevronDown, ShieldCheck, MapPin, Headphones, ArrowRight } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
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
  {
    icon: ShieldCheck,
    title: 'Verified riders',
    description:
      'Every rider submits an ID, a licence and vehicle registration, and we check them before their first trip.',
  },
  {
    icon: MapPin,
    title: 'Live trip sharing',
    description:
      'Share your trip with someone you trust and they can follow your location until you arrive.',
  },
  {
    icon: Headphones,
    title: 'SOS button',
    description:
      'One tap alerts our support team and shares your live location with your emergency contacts.',
  },
];

const paymentOptions = [
  {
    label: 'MTN',
    name: 'MTN MoMo',
    description: 'Pay straight from your MTN Mobile Money account',
    swatch: '#FFCC00',
    text: '#0D0D12',
  },
  {
    label: 'A',
    name: 'Airtel Money',
    description: 'Pay from your Airtel Money wallet',
    swatch: '#ED1C24',
    text: '#FFFFFF',
  },
  {
    label: 'UGX',
    name: 'Cash',
    description: 'Pay the rider in cash at the end of your trip',
    swatch: '#00FF88',
    text: '#0D0D12',
  },
];

function FAQAccordion({
  item,
  isOpen,
  onClick,
}: {
  item: FAQItem;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onClick}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-8 font-medium text-white">{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#00FF88] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <p className="pb-5 leading-relaxed text-white/60">{item.answer}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0D0D12]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo variant="dark" />

            <div className="hidden items-center gap-8 md:flex">
              <Link href="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-white">About</Link>
              <Link href="/help" className="text-sm font-medium text-[#00FF88]">Help</Link>
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

      <section className="px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Help
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/60">
            Answers to the questions we get most. If yours is not here, our
            support team can pick it up from the app.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl [&>*]:max-w-3xl">
          <h2 className="mb-8 text-3xl font-bold text-white">
            Frequently asked questions
          </h2>

          <div className="rounded-2xl border border-white/5 bg-[#1A1A1F] px-6">
            {faqData.map((item, index) => (
              <FAQAccordion
                key={item.question}
                item={item}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0F] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-3xl font-bold text-white">Staying safe</h2>

          <div className="grid grid-cols-1 border-t border-white/10 md:grid-cols-3">
            {safetyFeatures.map((feature) => (
              <div
                key={feature.title}
                className="border-b border-white/10 py-6 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
              >
                <div className="flex items-center gap-2.5">
                  <feature.icon className="h-4 w-4 shrink-0 text-[#00FF88]" />
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-3xl font-bold text-white">Ways to pay</h2>

          <dl className="max-w-3xl divide-y divide-white/10 border-t border-white/10">
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
                  <dd className="text-sm text-white/50">{option.description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-[#0A0A0F] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-3xl font-bold text-white">Still stuck?</h2>
          <p className="mb-8 max-w-2xl text-white/60">
            For a problem with a trip that is happening now, use in-app support.
            It reaches us with your trip details attached.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00FF88] px-8 py-4 font-semibold text-[#0D0D12] transition-colors hover:bg-[#00e07a]"
            >
              Contact support
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="mailto:support@smartride.ug"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 font-semibold text-white transition-colors hover:bg-white/5"
            >
              Email us
            </a>
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
