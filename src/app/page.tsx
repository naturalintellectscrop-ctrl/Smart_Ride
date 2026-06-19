'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
  Zap,
  Wallet,
  Siren,
  Menu,
  Download,
  ArrowRight,
  Mail,
  MapPin,
  CheckCircle2,
  Apple,
  Bookmark,
  Send,
  BadgePercent,
  Headphones,
  Compass,
  Lock,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  QrCode,
} from 'lucide-react';

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = {
  green: '#005f3a', // primary brand green
  neon: '#00FF88', // CTA / highlights
  cyan: '#00FFF3', // secondary highlights
  bg: '#0D0D12',
  bgAlt: '#111827',
  card: '#1A1A1F',
  cardAlt: '#252530',
  red: '#F43F5E',
};

// ─── Animation helpers ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────
const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Why Smart Ride', href: '#why' },
  { label: 'Blogs', href: '#blogs' },
  { label: 'Newsletter', href: '#newsletter' },
  { label: 'Contact', href: '#contact' },
];

const services = [
  {
    icon: Bike,
    title: 'Boda Ride',
    description:
      'Quick & affordable boda boda rides across Kampala. Beat the traffic with vetted riders near you.',
  },
  {
    icon: Car,
    title: 'Car Ride',
    description:
      'Comfortable car rides for longer trips, airport runs, and group travel. Upfront pricing, no haggling.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food Delivery',
    description:
      'Order from your favourite restaurants and local eateries. Hot meals delivered fast.',
  },
  {
    icon: Package,
    title: 'Package Delivery',
    description:
      'Send documents and parcels across town. Track your courier in real time from pickup to drop-off.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping & Groceries',
    description:
      'Groceries, matooke, and essentials from local stores. Shop from home, get it delivered fresh the same day.',
  },
  {
    icon: HeartPulse,
    title: 'Health & Pharmacy',
    description:
      'Pharmacy and health products delivered discreetly. Order prescriptions and OTC medicine anytime.',
  },
  {
    icon: Wallet,
    title: 'Smart Wallet',
    description:
      'Top up via MTN MoMo or Airtel Money. Pay for rides, food, and shopping with one tap — cashless & secure.',
  },
  {
    icon: Siren,
    title: 'SOS Safety',
    description:
      'One-tap SOS alerts share your live location with trusted contacts and Smart Ride support — always on.',
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Safety First',
    description:
      'Verified drivers, real-time trip tracking, in-app SOS, and 24/7 support keep every journey protected.',
  },
  {
    icon: BadgePercent,
    title: 'Transparent Pricing',
    description:
      'Know your fare before you ride. No hidden fees, no surprises — pay with cash, MTN MoMo, or Airtel Money.',
  },
  {
    icon: Zap,
    title: 'Fast Matching',
    description:
      'Quick pickups with a growing rider network — a ride is always nearby.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description:
      'Our Uganda-based support team is available round the clock via in-app chat, email, and phone.',
  },
  {
    icon: Compass,
    title: 'Local Knowledge',
    description:
      'Built in Uganda, for Uganda. Our drivers know the shortcuts, the stages, and the city like locals do.',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    description:
      'Bank-grade encryption protects your wallet and card. Every transaction is logged and refundable.',
  },
];

const footerLinks = {
  company: [
    { label: 'Services', href: '#services' },
    { label: 'Why Smart Ride', href: '#why' },
    { label: 'Blogs', href: '#blogs' },
    { label: 'Newsletter', href: '#newsletter' },
    { label: 'Contact', href: '#contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Delete Account', href: '/delete-account' },
  ],
};

// ─── Section heading ─────────────────────────────────────────────────────────
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
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="mx-auto max-w-2xl text-center"
    >
      <motion.div variants={fadeUp}>
        <Badge
          variant="outline"
          className="mb-4 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
        >
          {eyebrow}
        </Badge>
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="mt-4 text-base text-white/60 sm:text-lg"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const NEWSLETTER_KEY = 'smartride_newsletter_emails';

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(0);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // ─── Load persisted state on mount ─────────────────────────────────────────
  useEffect(() => {
    const stored = readJSON<string[]>(NEWSLETTER_KEY, []);
    setSubscriberCount(stored.length);
  }, []);

  // ─── Newsletter submit ─────────────────────────────────────────────────────
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    const existing = readJSON<string[]>(NEWSLETTER_KEY, []);
    if (existing.includes(email)) {
      toast({
        title: 'Already subscribed',
        description: "You're already on the list — thanks for being a fan!",
      });
      return;
    }
    const next = [...existing, email];
    writeJSON(NEWSLETTER_KEY, next);
    setSubscriberCount(next.length);
    setNewsletterEmail('');
    toast({
      title: 'Thanks for subscribing!',
      description: 'You will start receiving Smart Ride updates soon.',
    });
  };

  // ─── Contact form submit (non-functional placeholder) ──────────────────────
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in your name, email, and message.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Message sent',
      description: 'Thanks for reaching out — our team will reply within 24 hours.',
    });
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D12] font-sans text-white">
      {/* ─── Sticky Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D0D12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-[#00FF88]/20">
              <Image
                src="/smartride-logo-new.png"
                alt="Smart Ride Logo"
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

          {/* Desktop nav */}
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

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <a href="#download">
              <Button
                size="default"
                className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
              >
                <Download className="size-4" />
                Get the App
              </Button>
            </a>
          </div>

          {/* Mobile menu */}
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
                <SheetClose asChild>
                  <a href="#download" className="mt-3">
                    <Button className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a]">
                      <Download className="size-4" />
                      Get the App
                    </Button>
                  </a>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28 lg:pt-32"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#00FF88] opacity-10 blur-[128px]" />
          <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-[#005f3a] opacity-25 blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0D0D12]" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"
        >
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <motion.div variants={fadeUp}>
              <Badge
                variant="outline"
                className="mb-5 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
              >
                <MapPin className="size-3" />
                Now live across Uganda
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Move, eat, shop & pay —{' '}
              <span className="bg-gradient-to-r from-[#00FF88] to-[#00FFF3] bg-clip-text text-transparent">
                all in one app
              </span>{' '}
              built for Uganda
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg lg:mx-0"
            >
              Smart Ride brings boda rides, car rides, food delivery, groceries,
              pharmacy, a mobile wallet, and one-tap SOS safety together —
              powered by MTN MoMo and Airtel Money, built in Kampala.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <a href="#download" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
                >
                  <Download className="size-5" />
                  Get the App
                </Button>
              </a>
              <a href="#services" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Explore Services
                  <ArrowRight className="size-5" />
                </Button>
              </a>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60 lg:justify-start"
            >
              <div className="hidden items-center gap-1.5 sm:flex">
                <Shield className="size-4 text-[#00FF88]" />
                <span>SOS in every ride</span>
              </div>
            </motion.div>
          </div>

          {/* Right: hero visual */}
          <motion.div variants={scaleIn} className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#00FF88]/30 via-[#005f3a]/20 to-transparent blur-2xl" />
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative h-[420px] w-[210px] rounded-[2.5rem] border-4 border-white/10 bg-[#111827] shadow-2xl shadow-[#00FF88]/20">
                  <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20" />
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-lg shadow-[#00FF88]/30">
                      <Image
                        src="/smartride-logo-new.png"
                        alt="Smart Ride"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <p className="text-base font-bold text-white">Smart Ride</p>
                    <p className="text-center text-xs text-white/50">
                      Rides · Food · Shop · Pharmacy · Wallet · SOS
                    </p>
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
                          <span className="text-[10px] text-white/70">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { label: 'MTN MoMo', icon: Wallet },
            { label: 'Airtel Money', icon: Wallet },
            { label: 'Verified Riders', icon: Shield },
            { label: '24/7 Support', icon: Clock },
          ].map((b) => (
            <motion.div
              key={b.label}
              variants={fadeUp}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center"
            >
              <b.icon className="size-4 text-[#00FF88]" />
              <span className="text-xs font-medium text-white/70 sm:text-sm">
                {b.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Services ──────────────────────────────────────────────────────── */}
      <section id="services" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="What we offer"
            title={<>One app. <span className="text-[#00FF88]">Eight services.</span></>}
            subtitle="Everything you need to move, eat, shop, and pay — built for Uganda, delivered by riders you can trust."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {services.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1F] p-6 transition-all hover:-translate-y-1 hover:border-[#00FF88]/30 hover:shadow-lg hover:shadow-[#00FF88]/10"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00FF88]/10 text-[#00FF88] transition-colors group-hover:bg-[#00FF88]/20">
                  <s.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {s.description}
                </p>
                <a
                  href="#download"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#00FF88] transition-colors hover:text-[#00FFF3]"
                >
                  Learn more
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Why Smart Ride ────────────────────────────────────────────────── */}
      <section id="why" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Why Smart Ride"
            title={<>Built different. <span className="text-[#00FF88]">Built for Uganda.</span></>}
            subtitle="We sweat the details that matter — safety, fairness, speed, and local knowledge — so every trip just works."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                className="rounded-2xl border border-white/10 bg-[#1A1A1F] p-6"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00FF88]/10 text-[#00FF88]">
                  <b.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {b.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Blogs ─────────────────────────────────────────────────────────── */}
      <section id="blogs" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="From the Blog"
            title={<>Blogs &amp; <span className="text-[#00FF88]">insights</span></>}
            subtitle="Stories, updates, and insights from Smart Ride — coming soon."
          />

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-12 rounded-2xl border border-dashed border-white/15 bg-white/5 p-12 text-center"
          >
            <Bookmark className="mx-auto mb-3 size-8 text-[#00FF88]/50" />
            <p className="text-lg font-medium text-white">
              Our blog is coming soon
            </p>
            <p className="mt-2 text-sm text-white/60">
              We&apos;re putting the finishing touches on our first stories.
              Check back shortly for updates on safety, the Smart Ride Wallet,
              and our journey across Uganda.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Newsletter ────────────────────────────────────────────────────── */}
      <section id="newsletter" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="relative overflow-hidden rounded-3xl border border-[#00FF88]/20 bg-[#1A1A1F] p-8 text-center sm:p-12"
          >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#00FF88] opacity-15 blur-[100px]" />

            <motion.div variants={fadeUp}>
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00FF88]/10 text-[#00FF88]">
                <Mail className="size-7" />
              </div>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Join our Newsletter
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-base text-white/60 sm:text-lg">
              Get the latest Smart Ride updates, safety tips, and exclusive
              offers in your inbox.
            </motion.p>

            <motion.form
              variants={fadeUp}
              onSubmit={handleNewsletterSubmit}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
              />
              <Button
                type="submit"
                className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
              >
                <Send className="size-4" />
                Subscribe
              </Button>
            </motion.form>

            <motion.p variants={fadeUp} className="mt-4 text-sm text-white/50">
              {subscriberCount > 0 ? (
                <>
                  Join{' '}
                  <span className="font-semibold text-[#00FF88] tabular-nums">
                    {subscriberCount.toLocaleString('en-US')}
                  </span>{' '}
                  subscribers · We respect your privacy. Unsubscribe at any time.
                </>
              ) : (
                <>Join our newsletter · We respect your privacy. Unsubscribe at any time.</>
              )}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── Download / CTA ────────────────────────────────────────────────── */}
      <section id="download" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
            >
              <motion.div variants={fadeUp}>
                <Badge
                  variant="outline"
                  className="mb-4 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
                >
                  <Download className="size-3" />
                  Get the App
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Download Smart Ride and{' '}
                <span className="bg-gradient-to-r from-[#00FF88] to-[#00FFF3] bg-clip-text text-transparent">
                  move smarter today
                </span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-base text-white/70 sm:text-lg">
                Free to download. Available on Android and iOS. Top up with MTN
                MoMo or Airtel Money and move in minutes.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
                  aria-label="Download on Google Play"
                >
                  <Smartphone className="size-5" />
                  Google Play
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  aria-label="Download on the App Store"
                >
                  <Apple className="size-5" />
                  App Store
                </Button>
              </motion.div>

              <motion.ul variants={fadeUp} className="mt-8 grid gap-2 text-sm text-white/60">
                {[
                  'Top up instantly with MTN MoMo or Airtel Money',
                  'Pay for rides, food, and shopping in one app',
                  'SOS safety built into every trip',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#00FF88]" />
                    {item}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            {/* QR card */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              className="flex justify-center lg:justify-end"
            >
              <div className="rounded-3xl border border-white/10 bg-[#1A1A1F] p-8 text-center">
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-dashed border-[#00FF88]/30 bg-white/5">
                  <QrCode className="size-24 text-[#00FF88]" aria-hidden />
                </div>
                <p className="mt-4 text-sm font-medium text-white">
                  Scan to download
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Point your phone camera here
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Get in touch"
            title={<>Talk to <span className="text-[#00FF88]">the team</span></>}
            subtitle="Questions, partnerships, press, or feedback — we would love to hear from you."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Contact info */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              {[
                { icon: Mail, label: 'Email', value: 'support@smartride.ug', href: 'mailto:support@smartride.ug' },
                { icon: MapPin, label: 'Office', value: 'Kampala, Uganda', href: null },
                { icon: Clock, label: 'Support hours', value: '24/7 — always on', href: null },
              ].map((c) => (
                <motion.div
                  key={c.label}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#1A1A1F] p-5"
                >
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00FF88]/10 text-[#00FF88]">
                    <c.icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-white/40">
                      {c.label}
                    </div>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="text-base font-medium text-white transition-colors hover:text-[#00FF88]"
                      >
                        {c.value}
                      </a>
                    ) : (
                      <div className="text-base font-medium text-white">
                        {c.value}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Socials */}
              <motion.div variants={fadeUp} className="flex items-center gap-3 pt-2">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label="Smart Ride social media"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#00FF88]/30 hover:text-[#00FF88]"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </motion.div>
            </motion.div>

            {/* Contact form */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="rounded-2xl border border-white/10 bg-[#1A1A1F] p-6 sm:p-8"
            >
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-white/80">
                    Name
                  </label>
                  <Input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-white/80">
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-white/80">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    placeholder="How can we help?"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
                >
                  <Send className="size-4" />
                  Send message
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Footer (sticky bottom via mt-auto) ────────────────────────────── */}
      <footer className="mt-auto border-t border-white/10 bg-[#0D0D12] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 overflow-hidden rounded-xl">
                  <Image
                    src="/smartride-logo-new.png"
                    alt="Smart Ride Logo"
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <span className="text-lg font-bold text-white">Smart Ride</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm text-white/60">
                Uganda&apos;s all-in-one super app for rides, food, shopping,
                pharmacy, wallet, and safety. Built in Kampala by Natural
                Intellects Corp.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <MapPin className="size-3.5" />
                Kampala, Uganda
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Quick Links
              </h4>
              <ul className="mt-4 space-y-2">
                {footerLinks.company.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-[#00FF88]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
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

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Smart Ride · Natural Intellects Corp. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Smart Ride social media"
                  className="text-white/40 transition-colors hover:text-[#00FF88]"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
