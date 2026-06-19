'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
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
  Star,
  Zap,
  Users,
  Wallet,
  Siren,
  Menu,
  Download,
  ArrowRight,
  Mail,
  MapPin,
  CheckCircle2,
  Apple,
} from 'lucide-react';

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = {
  green: '#22C55E',
  greenDark: '#005f3a',
  bg: '#0D0D12',
  bgAlt: '#111827',
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
  { label: 'About', href: '#why' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
];

const services = [
  {
    icon: Bike,
    title: 'Ride-Hailing',
    description:
      'Quick & affordable boda boda and car rides across Uganda. Skip the traffic with vetted drivers near you.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food Delivery',
    description:
      'Order from your favourite restaurants. Hot meals delivered fast to your doorstep — track in real time.',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Shopping',
    description:
      'Groceries and essentials from local stores. Shop from home and get it delivered fresh the same day.',
  },
  {
    icon: HeartPulse,
    title: 'Pharmacy',
    description:
      'Pharmacy & health products delivered discreetly. Order prescriptions and OTC medicine anytime.',
  },
  {
    icon: Wallet,
    title: 'Smart Wallet',
    description:
      'Top up via MTN MoMo or Airtel Money. Pay for rides, food, and shopping with one tap — cashless & secure.',
  },
  {
    icon: Siren,
    title: 'Safety / SOS',
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
    icon: Zap,
    title: 'Fast Delivery',
    description:
      'Average pickup under 5 minutes in Kampala. Live ETAs and a vast rider network across the city.',
  },
  {
    icon: Wallet,
    title: 'Affordable Prices',
    description:
      'Transparent upfront pricing. Pay with cash, MTN MoMo, or Airtel Money — no hidden fees, ever.',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description:
      'Our Uganda-based support team is available round the clock via in-app chat, email, and phone.',
  },
];

const stats = [
  { icon: Car, value: '1M+', label: 'Rides Completed' },
  { icon: MapPin, value: '50+', label: 'Cities & Towns' },
  { icon: Users, value: '12K+', label: 'Active Drivers' },
  { icon: Star, value: '4.8', label: 'Average Rating' },
];

const blogPosts = [
  {
    id: '1',
    title: '5 Tips for a Safe Ride Experience',
    excerpt:
      'Make the most of your Smart Ride journey with these essential safety tips for every passenger.',
    date: 'Jan 15, 2026',
    category: 'Safety',
    readTime: '5 min read',
  },
  {
    id: '2',
    title: 'How to Become a Successful Driver Partner',
    excerpt:
      'Strategies our top-earning drivers use to maximize earnings and maintain excellent ratings.',
    date: 'Jan 12, 2026',
    category: 'Drivers',
    readTime: '7 min read',
  },
  {
    id: '3',
    title: 'Smart Food: The Ultimate Guide',
    excerpt:
      'Everything you need to know about ordering food — from finding restaurants to live delivery tracking.',
    date: 'Jan 10, 2026',
    category: 'Food',
    readTime: '6 min read',
  },
];

const footerLinks = {
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Help Center', href: '/help' },
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
      viewport={{ once: true, amount: 0.4 }}
      className="mx-auto max-w-2xl text-center"
    >
      <motion.div variants={fadeUp}>
        <Badge
          variant="outline"
          className="mb-4 border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/15"
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

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D12] font-sans text-white">
      {/* ─── Sticky Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D0D12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-[#22C55E]/20">
              <Image
                src="/smartride-logo-transparent.png"
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

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/intellects/login"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Admin Login
            </Link>
            <a href="#download">
              <Button
                size="default"
                className="bg-[#22C55E] text-[#0D0D12] hover:bg-[#1ea952] hover:shadow-lg hover:shadow-[#22C55E]/30"
              >
                <Download className="size-4" />
                Download App
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
                  <Link
                    href="/intellects/login"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    Admin Login
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#download" className="mt-3">
                    <Button className="w-full bg-[#22C55E] text-[#0D0D12] hover:bg-[#1ea952]">
                      <Download className="size-4" />
                      Download App
                    </Button>
                  </a>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28 lg:pt-32"
      >
        {/* Subtle animated background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#22C55E] opacity-10 blur-[128px]" />
          <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-[#005f3a] opacity-20 blur-[120px]" />
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
                className="mb-5 border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/15"
              >
                <MapPin className="size-3" />
                Now live across Uganda
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Smart Ride — Uganda&apos;s{' '}
              <span className="bg-gradient-to-r from-[#22C55E] to-[#86efac] bg-clip-text text-transparent">
                All-in-One Super App
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg lg:mx-0"
            >
              Ride-hailing, food delivery, shopping, pharmacy, wallet, and
              safety — all in one app. Built for Uganda, powered by Natural
              Intellects Corp.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <a href="#download" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-[#22C55E] text-[#0D0D12] hover:bg-[#1ea952] hover:shadow-lg hover:shadow-[#22C55E]/30"
                >
                  <Download className="size-5" />
                  Download App
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
              className="mt-8 flex items-center justify-center gap-6 text-sm text-white/60 lg:justify-start"
            >
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className="size-4 fill-[#22C55E] text-[#22C55E]"
                    />
                  ))}
                </div>
                <span>4.8 / 5 rating</span>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Users className="size-4 text-[#22C55E]" />
                <span>12K+ active drivers</span>
              </div>
            </motion.div>
          </div>

          {/* Right: hero visual */}
          <motion.div variants={scaleIn} className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#22C55E]/30 via-[#005f3a]/20 to-transparent blur-2xl" />
              {/* Phone mockup */}
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative h-[420px] w-[210px] rounded-[2.5rem] border-4 border-white/10 bg-[#111827] shadow-2xl shadow-[#22C55E]/20">
                  <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20" />
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-lg shadow-[#22C55E]/30">
                      <Image
                        src="/smartride-logo-transparent.png"
                        alt="Smart Ride"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <p className="text-base font-bold text-white">Smart Ride</p>
                    <p className="text-center text-xs text-white/50">
                      Rides · Food · Shopping · Pharmacy · Wallet · SOS
                    </p>
                    <div className="grid w-full grid-cols-3 gap-2">
                      {[
                        { icon: Bike, label: 'Ride' },
                        { icon: UtensilsCrossed, label: 'Food' },
                        { icon: ShoppingCart, label: 'Shop' },
                        { icon: HeartPulse, label: 'Meds' },
                        { icon: Wallet, label: 'Pay' },
                        { icon: Siren, label: 'SOS' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-2"
                        >
                          <item.icon className="size-4 text-[#22C55E]" />
                          <span className="text-[10px] text-white/60">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 w-full rounded-xl bg-[#22C55E] py-2 text-center text-xs font-semibold text-[#0D0D12]">
                      Where to?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Services Grid ─────────────────────────────────────────────────── */}
      <section
        id="services"
        className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Our Services"
            title={
              <>
                Everything you need,{' '}
                <span className="bg-gradient-to-r from-[#22C55E] to-[#86efac] bg-clip-text text-transparent">
                  one tap away
                </span>
              </>
            }
            subtitle="From daily commutes to grocery runs and pharmacy deliveries — Smart Ride brings six essential services together in a single app."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                variants={fadeUp}
                custom={i}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#22C55E]/40 hover:shadow-xl hover:shadow-[#22C55E]/10"
              >
                <div className="absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-[#22C55E] to-[#005f3a] transition-transform duration-300 group-hover:scale-x-100" />
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#22C55E]/10 text-[#22C55E] transition-colors group-hover:bg-[#22C55E]/20">
                  <service.icon className="size-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Why Choose Us ─────────────────────────────────────────────────── */}
      <section
        id="why"
        className="border-y border-white/10 bg-[#111827]/60 px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Why Choose Us"
            title={
              <>
                Built for Uganda,{' '}
                <span className="bg-gradient-to-r from-[#22C55E] to-[#86efac] bg-clip-text text-transparent">
                  trusted by thousands
                </span>
              </>
            }
            subtitle="Every detail of Smart Ride is engineered around safety, speed, affordability, and round-the-clock support."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-white/10 bg-[#0D0D12] p-7 text-center transition-colors hover:border-[#22C55E]/30"
              >
                <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]">
                  <b.icon className="size-7" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {b.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {b.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Stats Section ─────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#111827] to-[#0D0D12] p-8 sm:p-12 lg:grid-cols-4"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                custom={i}
                className="text-center"
              >
                <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
                  <s.icon className="size-5" />
                </div>
                <div className="text-3xl font-bold text-white sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-white/60">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── App Download Section ──────────────────────────────────────────── */}
      <section
        id="download"
        className="border-y border-white/10 bg-[#111827]/60 px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            <div>
              <motion.div variants={fadeUp}>
                <Badge
                  variant="outline"
                  className="mb-4 border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/15"
                >
                  <Smartphone className="size-3" />
                  Get the app
                </Badge>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                Download Smart Ride today
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-4 text-base text-white/70 sm:text-lg"
              >
                Available now on Android. iOS coming soon. Join thousands of
                Ugandans already riding, eating, and shopping smarter.
              </motion.p>

              <motion.ul
                variants={fadeUp}
                className="mt-6 space-y-2 text-sm text-white/70"
              >
                {[
                  'Free to download — no subscription',
                  'Cash, MTN MoMo & Airtel Money accepted',
                  'Verified drivers, live trip tracking',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#22C55E]" />
                    {item}
                  </li>
                ))}
              </motion.ul>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <a
                  href="https://smartrideug.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#22C55E] px-6 py-3.5 text-sm font-semibold text-[#0D0D12] transition-all hover:bg-[#1ea952] hover:shadow-lg hover:shadow-[#22C55E]/30 sm:w-auto"
                >
                  <Download className="size-5" />
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] font-normal opacity-80">
                      Download APK
                    </span>
                    <span className="block">Android</span>
                  </span>
                </a>
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/50 sm:w-auto"
                  aria-label="iOS coming soon"
                >
                  <Apple className="size-5" />
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] font-normal opacity-80">
                      Coming soon
                    </span>
                    <span className="block">iOS</span>
                  </span>
                </button>
              </motion.div>
              <motion.p
                variants={fadeUp}
                className="mt-4 text-xs text-white/40"
              >
                Visit{' '}
                <a
                  href="https://smartrideug.vercel.app"
                  className="text-[#22C55E] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  smartrideug.vercel.app
                </a>{' '}
                for the latest APK build.
              </motion.p>
            </div>

            {/* App mockup */}
            <motion.div variants={scaleIn} className="relative hidden lg:block">
              <div className="absolute inset-0 rounded-full bg-[#22C55E]/10 blur-3xl" />
              <div className="relative mx-auto aspect-square w-full max-w-sm rounded-3xl border border-white/10 bg-[#0D0D12] p-8">
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl shadow-lg shadow-[#22C55E]/30">
                    <Image
                      src="/smartride-logo-transparent.png"
                      alt="Smart Ride"
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <p className="text-lg font-bold text-white">Smart Ride</p>
                  <p className="text-center text-xs text-white/50">
                    Uganda&apos;s All-in-One Super App
                  </p>
                  <div className="mt-2 w-full rounded-xl bg-[#22C55E] py-2.5 text-center text-sm font-semibold text-[#0D0D12]">
                    Download now
                  </div>
                  <div className="flex gap-2 text-[#22C55E]">
                    <Bike className="size-5" />
                    <UtensilsCrossed className="size-5" />
                    <ShoppingCart className="size-5" />
                    <HeartPulse className="size-5" />
                    <Wallet className="size-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Blog Preview ──────────────────────────────────────────────────── */}
      <section
        id="blog"
        className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="From the Blog"
            title={
              <>
                Latest news &{' '}
                <span className="bg-gradient-to-r from-[#22C55E] to-[#86efac] bg-clip-text text-transparent">
                  stories
                </span>
              </>
            }
            subtitle="Tips, product updates, and stories from the Smart Ride community across Uganda."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {blogPosts.map((post, i) => (
              <motion.article
                key={post.id}
                variants={fadeUp}
                custom={i}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827] transition-all duration-300 hover:-translate-y-1 hover:border-[#22C55E]/40 hover:shadow-xl hover:shadow-[#22C55E]/10"
              >
                <div className="relative h-40 overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#22C55E]/15 to-[#005f3a]/20">
                  <div className="flex h-full items-center justify-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#22C55E]/20 text-[#22C55E]">
                      <Bike className="size-6" />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="absolute left-4 top-4 border-[#22C55E]/40 bg-[#0D0D12]/80 text-[#22C55E]"
                  >
                    {post.category}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-[#22C55E]">
                    {post.title}
                  </h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-white/60">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{post.date}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="mt-12 text-center"
          >
            <Link href="/blog">
              <Button
                variant="outline"
                size="lg"
                className="border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 hover:text-[#22C55E]"
              >
                View all articles
                <ArrowRight className="size-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Contact CTA ───────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#22C55E]/30 bg-gradient-to-br from-[#111827] to-[#0D0D12] p-8 text-center sm:p-12"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]"
          >
            <Mail className="size-7" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Need help? We&apos;re here for you.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-base text-white/70"
          >
            Questions about rides, payments, or partnerships? Reach out to our
            Uganda-based support team — available 24/7.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="mailto:support@smartride.ug"
              className="inline-flex items-center gap-2 rounded-xl bg-[#22C55E] px-6 py-3 text-sm font-semibold text-[#0D0D12] transition-all hover:bg-[#1ea952] hover:shadow-lg hover:shadow-[#22C55E]/30"
            >
              <Mail className="size-5" />
              support@smartride.ug
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Contact form
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/10 bg-[#0A0A0F] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link
                href="/"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-[#22C55E]/20">
                  <Image
                    src="/smartride-logo-transparent.png"
                    alt="Smart Ride Logo"
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">
                  Smart Ride
                </span>
              </Link>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
                Uganda&apos;s all-in-one super app for rides, food, shopping,
                pharmacy, wallet, and safety. Operated by Natural Intellects
                Corp.
              </p>
              <div className="mt-4 flex flex-col gap-1 text-sm text-white/50">
                <a
                  href="mailto:support@smartride.ug"
                  className="inline-flex items-center gap-2 transition-colors hover:text-[#22C55E]"
                >
                  <Mail className="size-4" />
                  support@smartride.ug
                </a>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4" />
                  Kampala, Uganda
                </span>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
                Company
              </h4>
              <ul className="space-y-3 text-sm">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/50 transition-colors hover:text-[#22C55E]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/intellects/login"
                    className="text-white/50 transition-colors hover:text-[#22C55E]"
                  >
                    Admin Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
                Legal
              </h4>
              <ul className="space-y-3 text-sm">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/50 transition-colors hover:text-[#22C55E]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-center text-sm text-white/40">
              © 2025 Smart Ride. Operated by Natural Intellects Corp. ·{' '}
              <a
                href="https://smartrideug.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#22C55E]"
              >
                smartrideug.vercel.app
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
