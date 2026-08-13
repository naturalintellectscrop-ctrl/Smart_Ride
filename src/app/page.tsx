'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { RouteMotif } from '@/components/marketing/RouteMotif';
import {
  Bike,
  Car,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  HeartPulse,
  Smartphone,
  Shield,
  Clock,
  Wallet,
  Siren,
  ArrowRight,
  ArrowUpRight,
  Mail,
  MapPin,
  CheckCircle2,
  Send,
  BadgePercent,
  Headphones,
  Compass,
  Lock,
  Building2,
} from 'lucide-react';

const services = [
  { icon: Bike, title: 'Boda rides', description: 'Boda boda rides across Kampala with riders whose ID, licence, and plate we have checked.' },
  { icon: Car, title: 'Car rides', description: 'Cars for longer trips, airport runs, and group travel. You see the fare before you accept it.' },
  { icon: UtensilsCrossed, title: 'Food delivery', description: 'Order from restaurants and local eateries, and follow the courier from kitchen to door.' },
  { icon: Package, title: 'Package delivery', description: 'Send documents and parcels across town, with live tracking from pickup to drop-off.' },
  { icon: ShoppingCart, title: 'Shopping and groceries', description: 'Groceries, matooke, and household essentials from local stores, delivered the same day.' },
  { icon: HeartPulse, title: 'Pharmacy', description: 'Prescription and over-the-counter medicine from licensed pharmacies, delivered discreetly.' },
  { icon: Wallet, title: 'Smart Wallet', description: 'Top up from MTN MoMo or Airtel Money once, then pay for any Smart Ride service from it.' },
  { icon: Siren, title: 'SOS button', description: 'One tap shares your live location with your emergency contacts and our support team.' },
];

const steps = [
  { number: '01', title: 'Tell us where you’re going', description: 'Drop a pin or type your destination. We show nearby riders and the fare before you commit to anything.' },
  { number: '02', title: 'Choose how you move', description: 'Boda for a quick hop, car for the family or the airport run. The price is fixed the moment you accept.' },
  { number: '03', title: 'Watch the trip happen', description: 'See your rider approach on the map, their name and plate confirmed, with a live ETA the whole way.' },
  { number: '04', title: 'Pay however suits you', description: 'MTN MoMo, Airtel Money, wallet balance, or cash to the rider — your choice, every time.' },
];

const benefits = [
  { icon: Shield, title: 'Riders we have checked', description: 'Every rider submits an ID, a licence, and vehicle registration, and we verify them before their first trip.' },
  { icon: BadgePercent, title: 'The fare you were quoted', description: 'The price you see when you book is the price you pay. No surge surprises, no haggling at the stage.' },
  { icon: Compass, title: 'Riders who know the city', description: 'Our riders work the routes they live on, so they know which stage is quicker at five in the evening.' },
  { icon: Wallet, title: 'Pay how you already pay', description: 'MTN MoMo, Airtel Money, or cash to the rider. Your wallet balance works across every service.' },
  { icon: Headphones, title: 'Support based in Uganda', description: 'Our support team is here in Kampala, reachable from inside the app or by email.' },
  { icon: Lock, title: 'Payments kept private', description: 'Card and wallet details are encrypted in transit and at rest, and every transaction is logged.' },
];

const stats = [
  { value: '1M+', label: 'Trips completed' },
  { value: '25K+', label: 'Verified riders' },
  { value: '99.8%', label: 'Trips completed safely' },
  { value: '24/7', label: 'Support coverage' },
];

const faqs = [
  {
    q: 'How do I book a ride?',
    a: 'Open the app, enter your destination, choose boda or car, and tap Request. You’ll see the fare before you confirm, and a nearby rider is matched to you.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'MTN Mobile Money, Airtel Money, and cash to the rider. You can also top up your Smart Ride wallet once and spend it across rides, food, shopping and pharmacy.',
  },
  {
    q: 'How do I track my ride?',
    a: 'Once a rider accepts, you’ll see their location on the map, along with their name, photo and vehicle details. You can call or message them from inside the app.',
  },
  {
    q: 'How do I become a rider or driver?',
    a: 'Download the app, create an account, and submit your ID, licence and vehicle registration. Once those clear verification you can start accepting requests.',
  },
];

export default function LandingPage() {
  const { toast } = useToast();

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      toast({
        title: 'Missing details',
        description: 'Please fill in your name, email, and message.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Message not sent',
          description: data.error || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Message sent',
        description: 'It has reached our support inbox and we will reply by email.',
      });
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch {
      toast({
        title: 'Message not sent',
        description: 'Check your connection and try again, or email support@smartride.ug.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C0E] font-sans text-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-white/10 px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00D97E]">
              Built and running in Kampala
            </span>
            <h1 className="mt-5 text-balance font-[family-name:var(--font-plus-jakarta)] text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
              One platform for how the city moves.
            </h1>
            <p className="mt-7 max-w-lg text-pretty text-lg leading-relaxed text-white/60">
              Book a boda or a car, order dinner, send a parcel, refill a
              prescription, and pay for all of it from a wallet you top up
              with MTN MoMo or Airtel Money.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#download">
                <Button size="lg" className="w-full rounded-full bg-white px-7 text-[#0B0C0E] hover:bg-white/90 sm:w-auto">
                  Get the app
                  <ArrowRight className="size-4" />
                </Button>
              </a>
              <a href="#services">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-white/15 bg-transparent px-7 text-white hover:bg-white/5 hover:text-white sm:w-auto"
                >
                  See what it does
                </Button>
              </a>
            </div>

            <dl className="mt-16 grid max-w-lg grid-cols-2 gap-x-8 gap-y-8 border-t border-white/10 pt-10 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-semibold text-white">
                    {s.value}
                  </dd>
                  <dd className="mt-1 text-xs leading-snug text-white/45">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <RouteMotif className="w-full" />
            <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/10 bg-[#0B0C0E]/90 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Estimated fare</span>
                <span className="font-semibold text-white">UGX 8,500</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/50">Rider arriving</span>
                <span className="font-semibold text-[#00D97E]">4 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <Section id="services">
        <SectionHeading
          eyebrow="Services"
          title="Everything Smart Ride does"
          subtitle="Eight services, one account, one wallet, one support team."
        />

        <div className="mt-16 divide-y divide-white/10 border-t border-white/10">
          {services.map((s, i) => (
            <div
              key={s.title}
              className="grid grid-cols-[3rem_1fr] items-baseline gap-x-6 py-6 sm:grid-cols-[3rem_16rem_1fr] sm:gap-x-10"
            >
              <span className="font-[family-name:var(--font-plus-jakarta)] text-sm text-white/30">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="flex items-center gap-2.5 font-semibold text-white">
                <s.icon className="size-4 shrink-0 text-[#00D97E]" />
                {s.title}
              </h3>
              <p className="col-start-2 mt-2 max-w-xl text-sm leading-relaxed text-white/50 sm:col-start-3 sm:mt-0">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" tone="contrast">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="How it works"
              title="A ride in a few taps"
              subtitle="No calling around, no negotiating at the stage. The app handles the parts that used to take time."
            />
          </div>

          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {steps.map((step) => (
              <div key={step.number}>
                <span className="font-[family-name:var(--font-plus-jakarta)] text-sm text-[#00D97E]">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Why Smart Ride */}
      <Section id="why">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="Why Smart Ride"
              title="What we do differently"
              subtitle="The things people tell us matter most when they are standing at a stage deciding who to ride with."
            />
          </div>

          <dl className="divide-y divide-white/10 border-t border-white/10">
            {benefits.map((b) => (
              <div key={b.title} className="grid gap-2 py-6 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
                <dt className="flex items-start gap-2.5">
                  <b.icon className="mt-0.5 size-4 shrink-0 text-[#00D97E]" />
                  <span className="font-semibold text-white">{b.title}</span>
                </dt>
                <dd className="text-sm leading-relaxed text-white/50">{b.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* Coverage */}
      <Section tone="contrast">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <div>
            <SectionHeading
              eyebrow="Coverage"
              title="We've got Kampala covered"
              subtitle="From the busiest junctions to the quiet estates, Smart Ride riders are already working your neighbourhood. New towns are added as our rider network grows."
            />
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-[#00D97E]"
            >
              Read about our coverage
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <RouteMotif className="mx-auto w-full max-w-sm opacity-90" />
        </div>
      </Section>

      {/* Safety & trust */}
      <Section id="safety">
        <SectionHeading
          eyebrow="Safety &amp; trust"
          title="Built for safety, built for you"
          subtitle="Every trip carries the same baseline of checks, whether it is your first ride or your five-hundredth."
        />

        <div className="mt-14 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
          {[
            { icon: Shield, title: 'Verified riders', description: 'ID, licence and vehicle registration checked before a rider takes their first trip.' },
            { icon: MapPin, title: 'Live trip tracking', description: 'Share your trip and let someone you trust follow your location until you arrive.' },
            { icon: Siren, title: 'SOS on every trip', description: 'One tap alerts our support team and shares your live location with your emergency contacts.' },
          ].map((f) => (
            <div key={f.title}>
              <f.icon className="size-5 text-[#00D97E]" />
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{f.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Business / driver & merchant opportunities */}
      <Section tone="contrast">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
          <div className="rounded-2xl border border-white/10 p-8 lg:p-10">
            <Building2 className="size-5 text-[#00D97E]" />
            <h3 className="mt-5 text-2xl font-semibold text-white">Smart Ride for Business</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
              Employee transport, scheduled deliveries, and monthly billing for
              teams that move people and goods every day.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-[#00D97E]"
            >
              Talk to our team
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 p-8 lg:p-10">
            <Bike className="size-5 text-[#00D97E]" />
            <h3 className="mt-5 text-2xl font-semibold text-white">Drive or deliver with us</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
              Set your own hours, get paid weekly, and keep every fare you
              earn transparent from request to drop-off.
            </p>
            <Link
              href="/about#drivers"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-[#00D97E]"
            >
              Become a rider
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* Download app */}
      <Section id="download">
        <div className="grid items-end gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Get the app"
              title="Download Smart Ride"
              subtitle="Free to download. Create an account with your phone number and top up from MTN MoMo or Airtel Money."
            />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={MOBILE_APP_CONFIG.storeLinks.playStore} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full rounded-full bg-white px-7 text-[#0B0C0E] hover:bg-white/90 sm:w-auto">
                  <Smartphone className="size-5" />
                  Get it on Google Play
                </Button>
              </a>
              <span className="flex items-center gap-2 text-sm text-white/40">
                <Clock className="size-4" />
                iPhone version in development
              </span>
            </div>
          </div>

          <ul className="grid gap-3 border-t border-white/10 pt-6 text-sm text-white/55 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {[
              'Top up from MTN MoMo or Airtel Money',
              'One wallet across rides, food, shopping and pharmacy',
              'SOS button on every trip',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#00D97E]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="contrast">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="FAQ"
              title="Common questions"
              subtitle="More answers live in our help centre."
            />
            <Link
              href="/help"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-[#00D97E]"
            >
              Visit the help centre
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <Accordion type="single" collapsible className="border-t border-white/10">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-white/10">
                <AccordionTrigger className="py-5 text-base font-medium text-white hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-white/55">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact">
        <SectionHeading
          eyebrow="Contact"
          title="Talk to the team"
          subtitle="Questions, partnerships, press, or something that went wrong on a trip."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <dl className="divide-y divide-white/10 border-t border-white/10">
            {[
              { icon: Mail, label: 'Email', value: 'support@smartride.ug', href: 'mailto:support@smartride.ug' },
              { icon: Headphones, label: 'Phone', value: '+256 785 710 818', href: 'tel:+256785710818' },
              { icon: MapPin, label: 'Office', value: 'Kampala, Uganda', href: null },
            ].map((c) => (
              <div key={c.label} className="flex items-baseline gap-4 py-5">
                <dt className="flex w-24 shrink-0 items-center gap-2 text-xs uppercase tracking-wide text-white/35">
                  <c.icon className="size-3.5" />
                  {c.label}
                </dt>
                <dd className="text-base font-medium text-white">
                  {c.href ? (
                    <a href={c.href} className="transition-colors hover:text-[#00D97E]">
                      {c.value}
                    </a>
                  ) : (
                    c.value
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <form onSubmit={handleContactSubmit} className="space-y-4 border-t border-white/10 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-white/70">
                Name
              </label>
              <Input
                id="contact-name"
                type="text"
                autoComplete="name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00D97E] focus-visible:ring-[#00D97E]/30"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-white/70">
                Email
              </label>
              <Input
                id="contact-email"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00D97E] focus-visible:ring-[#00D97E]/30"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-white/70">
                Message
              </label>
              <Textarea
                id="contact-message"
                rows={4}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00D97E] focus-visible:ring-[#00D97E]/30"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={sending}
              className="w-full rounded-full bg-white text-[#0B0C0E] hover:bg-white/90"
            >
              <Send className="size-4" />
              {sending ? 'Sending...' : 'Send message'}
            </Button>
          </form>
        </div>
      </Section>

      <MarketingFooter />
    </div>
  );
}
