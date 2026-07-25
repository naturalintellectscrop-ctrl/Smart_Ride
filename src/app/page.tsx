'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
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
  Menu,
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
} from 'lucide-react';

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Why Smart Ride', href: '#why' },
  { label: 'Get the app', href: '#download' },
  { label: 'Contact', href: '#contact' },
];

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

const footerLinks = {
  company: [
    { label: 'About', href: '/about' },
    { label: 'Help centre', href: '/help' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' },
  ],
  legal: [
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Terms of service', href: '/terms' },
    { label: 'Delete account', href: '/delete-account' },
  ],
};

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="max-w-xl">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00FF88]">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-white/60">{subtitle}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-[#0D0D12] font-sans text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D0D12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl">
              <Image
                src="/smartride-logo-new.png"
                alt=""
                fill
                className="object-cover"
                priority
                sizes="36px"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Smart Ride
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <a href="#download">
              <Button className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a]">
                <Download className="size-4" />
                Get the app
              </Button>
            </a>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] border-white/10 bg-[#0D0D12] text-white"
            >
              <SheetHeader>
                <SheetTitle className="text-left text-white">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <a
                      href={link.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section id="hero" className="px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <Badge
              variant="outline"
              className="mb-5 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
            >
              <MapPin className="size-3" />
              Built and running in Kampala
            </Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Rides, food, shopping and payments in one app
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg lg:mx-0">
              Book a boda or a car, order dinner, send a parcel, refill a
              prescription, and pay for all of it from a wallet you top up with
              MTN MoMo or Airtel Money.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <a href="#download" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a]">
                  <Download className="size-5" />
                  Get the app
                </Button>
              </a>
              <a href="#services" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  See what it does
                  <ArrowRight className="size-5" />
                </Button>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative h-[420px] w-[210px] rounded-[2.5rem] border-4 border-white/10 bg-[#111827]">
                  <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20" />
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                      <Image
                        src="/smartride-logo-new.png"
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <p className="text-base font-bold text-white">Smart Ride</p>
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
                          className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-2"
                        >
                          <item.icon className="size-4 text-[#00FF88]" />
                          <span className="text-[10px] text-white/70">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Services"
            title="Everything Smart Ride does"
            subtitle="Eight services, one account, one wallet, one support team."
          />

          <div className="mt-14 grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div
                key={s.title}
                className="border-b border-white/10 px-0 py-6 sm:odd:pr-8 sm:even:border-l sm:even:pl-8 lg:border-l lg:px-6 lg:first:border-l-0 lg:[&:nth-child(4n+1)]:border-l-0 lg:[&:nth-child(4n+1)]:pl-0"
              >
                <div className="flex items-center gap-2.5">
                  <s.icon className="size-4 shrink-0 text-[#00FF88]" />
                  <h3 className="font-semibold text-white">{s.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
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
                  <b.icon className="mt-0.5 size-4 shrink-0 text-[#00FF88]" />
                  <span className="font-semibold text-white">{b.title}</span>
                </dt>
                <dd className="text-sm leading-relaxed text-white/55">
                  {b.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="download" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-end gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Get the app"
              title="Download Smart Ride"
              subtitle="Free to download. Create an account with your phone number and top up from MTN MoMo or Airtel Money."
            />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={MOBILE_APP_CONFIG.storeLinks.playStore}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] sm:w-auto">
                  <Smartphone className="size-5" />
                  Get it on Google Play
                </Button>
              </a>
              <span className="flex items-center gap-2 text-sm text-white/45">
                <Clock className="size-4" />
                iPhone version in development
              </span>
            </div>
          </div>

          <ul className="grid gap-3 border-t border-white/10 pt-6 text-sm text-white/60 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {[
              'Top up from MTN MoMo or Airtel Money',
              'One wallet across rides, food, shopping and pharmacy',
              'SOS button on every trip',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#00FF88]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Contact"
            title="Talk to the team"
            subtitle="Questions, partnerships, press, or something that went wrong on a trip."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <dl className="divide-y divide-white/10 border-t border-white/10">
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
                  <dt className="flex w-24 shrink-0 items-center gap-2 text-xs uppercase tracking-wide text-white/40">
                    <c.icon className="size-3.5" />
                    {c.label}
                  </dt>
                  <dd className="text-base font-medium text-white">
                    {c.href ? (
                      <a href={c.href} className="transition-colors hover:text-[#00FF88]">
                        {c.value}
                      </a>
                    ) : (
                      c.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="rounded-2xl border border-white/10 bg-[#1A1A1F] p-6 sm:p-8">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-1.5 block text-sm font-medium text-white/80"
                  >
                    Name
                  </label>
                  <Input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-1.5 block text-sm font-medium text-white/80"
                  >
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-message"
                    className="mb-1.5 block text-sm font-medium text-white/80"
                  >
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={sending}
                  className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a]"
                >
                  <Send className="size-4" />
                  {sending ? 'Sending...' : 'Send message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-white/10 bg-[#0D0D12] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 overflow-hidden rounded-xl">
                  <Image
                    src="/smartride-logo-new.png"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <span className="text-lg font-bold text-white">Smart Ride</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm text-white/60">
                Rides, food, shopping, pharmacy and payments in one app. Built in
                Kampala by Natural Intellects Corp.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <MapPin className="size-3.5" />
                Kampala, Uganda
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Company
              </h4>
              <ul className="mt-4 space-y-2">
                {footerLinks.company.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-[#00FF88]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Legal
              </h4>
              <ul className="mt-4 space-y-2">
                {footerLinks.legal.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-[#00FF88]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Smart Ride, Natural Intellects Corp.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
