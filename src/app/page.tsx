'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Reveal } from '@/components/marketing/Reveal';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FarePreviewCard, TrackingPreviewCard } from '@/components/marketing/ProductPreviewCard';
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
  Download,
  ArrowRight,
  Mail,
  MapPin,
  CheckCircle2,
  Send,
  BadgePercent,
  Headphones,
  Compass,
  Lock,
  IdCard,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';

const services = [
  {
    icon: Bike,
    title: 'Boda rides',
    description:
      'Boda boda rides across Kampala with riders whose ID, licence, and plate we have checked.',
  },
  {
    icon: Car,
    title: 'Car rides',
    description:
      'Cars for longer trips, airport runs, and group travel. You see the fare before you accept it.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food delivery',
    description:
      'Order from restaurants and local eateries, and follow the courier from kitchen to door.',
  },
  {
    icon: Package,
    title: 'Package delivery',
    description:
      'Send documents and parcels across town, with live tracking from pickup to drop-off.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping and groceries',
    description:
      'Groceries, matooke, and household essentials from local stores, delivered the same day.',
  },
  {
    icon: HeartPulse,
    title: 'Pharmacy',
    description:
      'Prescription and over-the-counter medicine from licensed pharmacies, delivered discreetly.',
  },
  {
    icon: Wallet,
    title: 'Smart Wallet',
    description:
      'Top up from MTN MoMo or Airtel Money once, then pay for any Smart Ride service from it.',
  },
  {
    icon: Siren,
    title: 'SOS button',
    description:
      'One tap shares your live location with your emergency contacts and our support team.',
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Riders we have checked',
    description:
      'Every rider submits an ID, a licence, and vehicle registration, and we verify them before their first trip.',
  },
  {
    icon: BadgePercent,
    title: 'The fare you were quoted',
    description:
      'The price you see when you book is the price you pay. No surge surprises, no haggling at the stage.',
  },
  {
    icon: Compass,
    title: 'Riders who know the city',
    description:
      'Our riders work the routes they live on, so they know which stage is quicker at five in the evening.',
  },
  {
    icon: Wallet,
    title: 'Pay how you already pay',
    description:
      'MTN MoMo, Airtel Money, or cash to the rider. Your wallet balance works across every service.',
  },
  {
    icon: Headphones,
    title: 'Support based in Uganda',
    description:
      'Our support team is here in Kampala, reachable from inside the app or by email.',
  },
  {
    icon: Lock,
    title: 'Payments kept private',
    description:
      'Card and wallet details are encrypted in transit and at rest, and every transaction is logged.',
  },
];

const verificationSteps = [
  {
    icon: IdCard,
    title: 'ID checked',
    description: 'A government-issued ID is verified before anyone can accept their first request.',
  },
  {
    icon: FileCheck,
    title: 'Licence and registration checked',
    description: "A rider's driving licence and vehicle registration are checked against the vehicle they use.",
  },
  {
    icon: ShieldCheck,
    title: 'Verified before their first trip',
    description: 'None of this happens after the fact. It clears before a rider can take a single request.',
  },
];

const faqs = [
  {
    q: 'How do I book a ride?',
    a: "Open the app, enter your destination, choose boda or car, and tap Request. You'll see the fare before you confirm, and a nearby rider is matched to you.",
  },
  {
    q: 'What payment methods are accepted?',
    a: 'MTN Mobile Money, Airtel Money, and cash to the rider. You can also top up your Smart Ride wallet once and spend it across rides, food, shopping and pharmacy.',
  },
  {
    q: 'How do I track my ride?',
    a: "Once a rider accepts, you'll see their location on the map, along with their name, photo and vehicle details. You can call or message them from inside the app.",
  },
  {
    q: 'How do I become a rider or driver?',
    a: 'Download the app, create an account, and submit your ID, licence and vehicle registration. Once those clear verification you can start accepting requests.',
  },
  {
    q: 'Is my personal information secure?',
    a: 'Your account details and payment information are encrypted in transit and at rest. We do not sell your data or share it with third parties for marketing.',
  },
];

function LandingContent() {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

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
    <>
      <MarketingHeader />

      {/* Hero */}
      <section id="hero" className="px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Badge
                variant="outline"
                className="mb-5 border-mkt-accent/40 bg-mkt-accent/10 text-mkt-accent hover:bg-mkt-accent/15"
              >
                <MapPin className="size-3" />
                Built and running in Kampala
              </Badge>
            </motion.div>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl font-bold leading-tight tracking-tight text-mkt-fg sm:text-5xl lg:text-6xl"
            >
              Rides, food, shopping and payments in one app
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 max-w-xl text-base text-mkt-fg-muted sm:text-lg lg:mx-0"
            >
              Book a boda or a car, order dinner, send a parcel, refill a
              prescription, and pay for all of it from a wallet you top up with
              MTN MoMo or Airtel Money.
            </motion.p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <a href="#download" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-mkt-accent text-mkt-accent-fg hover:opacity-90">
                  <Download className="size-5" />
                  Get the app
                </Button>
              </a>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-mkt-border bg-mkt-bg-raised text-mkt-fg hover:bg-mkt-bg-raised/70 hover:text-mkt-fg"
                >
                  See how it works
                  <ArrowRight className="size-5" />
                </Button>
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative h-[420px] w-[210px] rounded-[2.5rem] border-4 border-mkt-border bg-mkt-bg-raised">
                  <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-mkt-fg-faint/40" />
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                      <Image src="/icon.png" alt="" fill className="object-cover" sizes="64px" />
                    </div>
                    <p className="text-base font-bold text-mkt-fg">Smart Ride</p>
                    <div className="grid w-full grid-cols-3 gap-2">
                      {[
                        { icon: Bike, label: 'Ride' },
                        { icon: UtensilsCrossed, label: 'Food' },
                        { icon: ShoppingCart, label: 'Shop' },
                        { icon: HeartPulse, label: 'Meds' },
                        { icon: Wallet, label: 'Wallet' },
                        { icon: Siren, label: 'SOS' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col items-center gap-1 rounded-lg bg-mkt-bg py-2"
                        >
                          <item.icon className="size-4 text-mkt-accent" />
                          <span className="text-[10px] text-mkt-fg-muted">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services: flagship moments + full list */}
      <Section id="services" tone="raised">
        <Reveal>
          <SectionHeading
            eyebrow="What we do"
            title="Everything Smart Ride does"
            subtitle="Eight services, one account, one wallet, one support team."
          />
        </Reveal>

        {/* Flagship spotlight rows */}
        <div className="mt-16 space-y-16">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mkt-accent">
                Rides
              </span>
              <h3 className="mt-3 text-2xl font-bold text-mkt-fg sm:text-3xl">
                Know the fare before you ride
              </h3>
              <p className="mt-3 max-w-md text-mkt-fg-muted">
                Boda for a quick hop across town, car for the airport run or the
                family trip. Either way, the price you see is the price you pay,
                fixed before you request.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="flex justify-center lg:justify-end">
              <FarePreviewCard
                from="Bugolobi, Kampala"
                to="Acacia Mall, Kisementi"
                fare="UGX 8,500"
                eta="4 min"
              />
            </Reveal>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <Reveal delay={0.1} className="order-2 flex justify-center lg:order-1 lg:justify-start">
              <TrackingPreviewCard status="Order on the way" courier="Courier: David · Boda" step={2} />
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mkt-accent">
                Delivery
              </span>
              <h3 className="mt-3 text-2xl font-bold text-mkt-fg sm:text-3xl">
                Watch it move from kitchen to door
              </h3>
              <p className="mt-3 max-w-md text-mkt-fg-muted">
                Food, groceries, a prescription, or a parcel across town: the
                same live tracking follows every delivery from pickup to your
                doorstep.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Full service list */}
        <div className="mt-16 grid border-t border-mkt-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={(i % 4) * 0.05}>
              <div className="border-b border-mkt-border px-0 py-6 sm:odd:pr-8 sm:even:border-l sm:even:pl-8 lg:border-l lg:px-6 lg:[&:nth-child(4n+1)]:border-l-0 lg:[&:nth-child(4n+1)]:pl-0">
                <div className="flex items-center gap-2.5">
                  <s.icon className="size-4 shrink-0 text-mkt-accent" />
                  <h3 className="font-semibold text-mkt-fg">{s.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mkt-fg-muted">{s.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works">
        <Reveal>
          <SectionHeading
            title="A ride in a few steps"
            subtitle="No calling around, no negotiating at the stage. Here is what actually happens between opening the app and arriving."
            className="mx-auto text-center"
          />
        </Reveal>
        <div className="mt-16">
          <HowItWorks />
        </div>
      </Section>

      {/* Why Smart Ride */}
      <Section id="why" tone="raised">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <SectionHeading
                title="What we do differently"
                subtitle="The things people tell us matter most when they are standing at a stage deciding who to ride with."
              />
            </Reveal>
          </div>

          <dl className="divide-y divide-mkt-border border-t border-mkt-border">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.06}>
                <div className="grid gap-2 py-6 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
                  <dt className="flex items-start gap-2.5">
                    <b.icon className="mt-0.5 size-4 shrink-0 text-mkt-accent" />
                    <span className="font-semibold text-mkt-fg">{b.title}</span>
                  </dt>
                  <dd className="text-sm leading-relaxed text-mkt-fg-muted">{b.description}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </Section>

      {/* Coverage & verification */}
      <Section id="coverage">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <SectionHeading
                title="Every rider goes through the same checks"
                subtitle="Kampala first, expanding as our verified rider network grows into new towns."
              />
            </Reveal>
          </div>

          <ol className="divide-y divide-mkt-border border-t border-mkt-border">
            {verificationSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <li className="flex items-start gap-4 py-6">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-mkt-accent/40 bg-mkt-accent/10 text-mkt-accent">
                    <step.icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-mkt-fg">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-mkt-fg-muted">{step.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* Download */}
      <Section id="download" tone="raised">
        <div className="mx-auto grid max-w-7xl items-end gap-10 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              eyebrow="Get the app"
              title="Download Smart Ride"
              subtitle="Free to download. Create an account with your phone number and top up from MTN MoMo or Airtel Money."
            />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={MOBILE_APP_CONFIG.storeLinks.playStore} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full bg-mkt-accent text-mkt-accent-fg hover:opacity-90 sm:w-auto">
                  <Smartphone className="size-5" />
                  Get it on Google Play
                </Button>
              </a>
              <span className="flex items-center gap-2 text-sm text-mkt-fg-faint">
                <Clock className="size-4" />
                iPhone version in development
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="grid gap-3 border-t border-mkt-border pt-6 text-sm text-mkt-fg-muted lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              {[
                'Top up from MTN MoMo or Airtel Money',
                'One wallet across rides, food, shopping and pharmacy',
                'SOS button on every trip',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mkt-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <SectionHeading
                title="Common questions"
                subtitle="More answers live in our help centre."
              />
              <Link
                href="/help"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-mkt-fg transition-colors hover:text-mkt-accent"
              >
                Visit the help centre
                <ArrowRight className="size-4" />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.05}>
            <Accordion type="single" collapsible className="border-t border-mkt-border">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q} className="border-mkt-border">
                  <AccordionTrigger className="py-5 text-base font-medium text-mkt-fg hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-mkt-fg-muted">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" tone="raised">
        <Reveal>
          <SectionHeading
            title="Talk to the team"
            subtitle="Questions, partnerships, press, or something that went wrong on a trip."
          />
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <dl className="divide-y divide-mkt-border border-t border-mkt-border">
              {[
                {
                  icon: Mail,
                  label: 'Email',
                  value: 'support@smartride.ug',
                  href: 'mailto:support@smartride.ug',
                },
                {
                  icon: Headphones,
                  label: 'Phone',
                  value: '+256 785 710 818',
                  href: 'tel:+256785710818',
                },
                { icon: MapPin, label: 'Office', value: 'Kampala, Uganda', href: null },
              ].map((c) => (
                <div key={c.label} className="flex items-baseline gap-4 py-5">
                  <dt className="flex w-24 shrink-0 items-center gap-2 text-xs uppercase tracking-wide text-mkt-fg-faint">
                    <c.icon className="size-3.5" />
                    {c.label}
                  </dt>
                  <dd className="text-base font-medium text-mkt-fg">
                    {c.href ? (
                      <a href={c.href} className="transition-colors hover:text-mkt-accent">
                        {c.value}
                      </a>
                    ) : (
                      c.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-2xl border border-mkt-border bg-mkt-bg p-6 sm:p-8">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-mkt-fg">
                    Name
                  </label>
                  <Input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="border-mkt-border bg-mkt-bg-raised text-mkt-fg placeholder:text-mkt-fg-faint focus-visible:border-mkt-accent focus-visible:ring-mkt-accent/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-mkt-fg">
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-mkt-border bg-mkt-bg-raised text-mkt-fg placeholder:text-mkt-fg-faint focus-visible:border-mkt-accent focus-visible:ring-mkt-accent/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-mkt-fg">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="border-mkt-border bg-mkt-bg-raised text-mkt-fg placeholder:text-mkt-fg-faint focus-visible:border-mkt-accent focus-visible:ring-mkt-accent/30"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={sending}
                  className="w-full bg-mkt-accent text-mkt-accent-fg hover:opacity-90"
                >
                  <Send className="size-4" />
                  {sending ? 'Sending...' : 'Send message'}
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      </Section>

      <MarketingFooter />
    </>
  );
}

export default function LandingPage() {
  return (
    <MarketingShell>
      <LandingContent />
    </MarketingShell>
  );
}
