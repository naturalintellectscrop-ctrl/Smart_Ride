'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bike,
  Car,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  HeartPulse,
  Smartphone,
  Search,
  UserCheck,
  Star,
  Banknote,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Menu,
  Download,
  ChevronRight,
  MapPin,
  Mail,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  DollarSign,
  Users,
  FileText,
  Calendar,
  BookOpen,
  AlertTriangle,
  Globe,
  Sparkles,
  Lock,
} from 'lucide-react';

// ─── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const navLinks = [
  { label: 'About', href: '/about' },
  { label: 'Help', href: '/help' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '/blog' },
];

const services = [
  {
    icon: Bike,
    title: 'Smart Boda',
    description: 'Quick & affordable motorcycle taxi rides across town. Skip the traffic with our vast boda network.',
    color: '#22C55E',
  },
  {
    icon: Car,
    title: 'Smart Car',
    description: 'Comfortable car rides with professional drivers. Perfect for longer trips and special occasions.',
    color: '#3B82F6',
  },
  {
    icon: UtensilsCrossed,
    title: 'Smart Food',
    description: 'Order from your favourite restaurants. Hot meals delivered fast to your doorstep.',
    color: '#F59E0B',
  },
  {
    icon: Package,
    title: 'Smart Delivery',
    description: 'Send and receive packages seamlessly. Reliable delivery for documents, parcels & more.',
    color: '#8B5CF6',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Shopping',
    description: 'Groceries and essentials from local stores. Shop from home and get it delivered fresh.',
    color: '#EC4899',
  },
  {
    icon: HeartPulse,
    title: 'Smart Health',
    description: 'Pharmacy & health products delivered discreetly. Order prescriptions and OTC medicine anytime.',
    color: '#EF4444',
  },
];

const steps = [
  {
    icon: Smartphone,
    title: 'Open the App',
    description: 'Download Smart Ride and create your account in seconds.',
  },
  {
    icon: Search,
    title: 'Choose Service',
    description: 'Pick from rides, food, delivery, shopping, or health.',
  },
  {
    icon: UserCheck,
    title: 'Get Matched',
    description: "We'll connect you with the nearest available rider or driver.",
  },
  {
    icon: Star,
    title: 'Pay & Rate',
    description: 'Pay your way — cash or mobile money — then rate your experience.',
  },
];

const testimonials = [
  {
    quote: 'Smart Ride made my daily commute so easy!',
    name: 'Sarah K.',
    location: 'Kampala',
    avatar: 'SK',
  },
  {
    quote: 'I earn a great living as a Smart Ride driver',
    name: 'James M.',
    location: 'Entebbe',
    avatar: 'JM',
  },
  {
    quote: 'Food delivery in under 30 minutes — amazing!',
    name: 'Grace N.',
    location: 'Makindye',
    avatar: 'GN',
  },
];

const paymentMethods = [
  {
    icon: Banknote,
    label: 'Cash',
    description: 'Pay with cash on delivery',
    color: '#22C55E',
  },
  {
    icon: Phone,
    label: 'MTN MoMo',
    description: 'MTN Mobile Money',
    color: '#F5A623',
  },
  {
    icon: Phone,
    label: 'Airtel Money',
    description: 'Airtel mobile payments',
    color: '#E4002B',
  },
];

const footerLinks = {
  quickLinks: [
    { label: 'About Us', href: '/about' },
    { label: 'Help Center', href: '/help' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' },
    { label: 'Admin Portal', href: '/intellects/login' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

// ─── Blog content blocks ────────────────────────────────────────────────────

type BlogBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] };

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  icon: typeof FileText;
  accent: string;
  featured?: boolean;
  comingSoon?: boolean;
  content?: BlogBlock[];
};

const accountDeletionContent: BlogBlock[] = [
  {
    type: 'paragraph',
    text: 'Effective Date: June 18, 2026',
  },
  {
    type: 'paragraph',
    text: 'Last Updated: June 18, 2026',
  },
  {
    type: 'paragraph',
    text: 'Smart Ride respects your right to control your personal information. This Account Deletion Policy explains how Smart Ride users may request account deletion and what happens to associated information after deletion.',
  },
  {
    type: 'heading',
    text: 'How to Delete Your Account',
  },
  {
    type: 'paragraph',
    text: 'Users may delete their Smart Ride account through one of the following methods:',
  },
  {
    type: 'subheading',
    text: 'In-App Deletion',
  },
  {
    type: 'list',
    ordered: true,
    items: [
      'Open the Smart Ride application.',
      'Navigate to Profile.',
      'Open Settings.',
      'Select Delete Account.',
      'Confirm your request.',
      'Complete any required identity verification.',
    ],
  },
  {
    type: 'subheading',
    text: 'Support Request',
  },
  {
    type: 'paragraph',
    text: 'Users may also request account deletion by contacting Smart Ride Support. Please include the phone number or email address associated with your account.',
  },
  {
    type: 'heading',
    text: 'What Happens After Deletion',
  },
  {
    type: 'paragraph',
    text: 'When an account deletion request is approved:',
  },
  {
    type: 'list',
    items: [
      'Access to the account is removed.',
      'Profile information is deleted or anonymized.',
      'Login credentials become invalid.',
      'Personal identifiers may be removed from active systems.',
    ],
  },
  {
    type: 'heading',
    text: 'Information That May Be Retained',
  },
  {
    type: 'paragraph',
    text: 'Certain information may be retained where permitted or required by law, including:',
  },
  {
    type: 'list',
    items: [
      'Transaction records',
      'Ride and delivery records',
      'Audit logs',
      'Fraud prevention records',
      'Security investigation records',
      'Customer support records',
      'Legal compliance records',
    ],
  },
  {
    type: 'paragraph',
    text: 'Such information will only be retained for legitimate business, legal, safety, or regulatory purposes.',
  },
  {
    type: 'heading',
    text: 'Retention Period',
  },
  {
    type: 'paragraph',
    text: 'Information retained after account deletion will be stored only for as long as necessary to:',
  },
  {
    type: 'list',
    items: [
      'Comply with legal obligations',
      'Resolve disputes',
      'Prevent fraud',
      'Enforce agreements',
      'Maintain security',
    ],
  },
  {
    type: 'paragraph',
    text: 'After retention requirements expire, information will be deleted or anonymized.',
  },
  {
    type: 'heading',
    text: 'Effect on Active Services',
  },
  {
    type: 'paragraph',
    text: 'Accounts with active rides, deliveries, disputes, investigations, or unresolved obligations may not be immediately eligible for deletion until those matters are resolved.',
  },
  {
    type: 'heading',
    text: 'Changes to This Policy',
  },
  {
    type: 'paragraph',
    text: 'Smart Ride may update this Account Deletion Policy from time to time. Updated versions will be posted through the Smart Ride application or website.',
  },
  {
    type: 'heading',
    text: 'Contact',
  },
  {
    type: 'paragraph',
    text: 'For questions regarding account deletion, contact Smart Ride Support.',
  },
  {
    type: 'list',
    items: [
      'Email: support@smartride.ug',
      'Website: https://smartride.ug',
      'Location: Kampala, Uganda',
    ],
  },
];

const blogPosts: BlogPost[] = [
  {
    id: 'account-deletion-policy',
    title: 'Smart Ride Account Deletion Policy',
    excerpt:
      'Your right to control your personal information. Learn how to request account deletion and what happens to your data afterwards.',
    category: 'Privacy & Policy',
    date: 'June 18, 2026',
    readTime: '4 min read',
    icon: FileText,
    accent: '#22C55E',
    featured: true,
    content: accountDeletionContent,
  },
  {
    id: 'seamless-payments',
    title: 'Seamless Payments Across Uganda',
    excerpt:
      'How Smart Ride is making MTN MoMo, Airtel Money and card payments faster and more reliable for every ride and delivery.',
    category: 'Product Updates',
    date: 'Coming Soon',
    readTime: '3 min read',
    icon: Banknote,
    accent: '#F59E0B',
    comingSoon: true,
  },
  {
    id: 'driver-safety',
    title: 'Driver & Rider Safety Updates',
    excerpt:
      'New safety features rolling out to keep every Smart Ride journey secure, from verified drivers to in-app emergency tools.',
    category: 'Safety',
    date: 'Coming Soon',
    readTime: '5 min read',
    icon: Shield,
    accent: '#3B82F6',
    comingSoon: true,
  },
];

// Renders a single structured content block inside the article dialog
function BlogBlockRenderer({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h3 className="text-xl sm:text-2xl font-bold text-white mt-8 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-6 rounded-full bg-[#22C55E] shrink-0" />
          {block.text}
        </h3>
      );
    case 'subheading':
      return (
        <h4 className="text-lg font-semibold text-[#22C55E] mt-6 mb-2">
          {block.text}
        </h4>
      );
    case 'paragraph':
      return (
        <p className="text-gray-300 leading-relaxed mb-4 text-[15px]">
          {block.text}
        </p>
      );
    case 'list':
      return block.ordered ? (
        <ol className="list-none space-y-2 mb-4 ml-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-300 text-[15px] leading-relaxed">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#005f3a]/40 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2 mb-4 ml-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-300 text-[15px] leading-relaxed">
              <CheckCircle2 className="shrink-0 w-5 h-5 text-[#22C55E] mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NAVIGATION                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#111827]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo variant="dark" />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-300 hover:text-[#22C55E] transition-colors duration-200 text-sm font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/intellects/login">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  Admin
                </Button>
              </Link>
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white shadow-lg shadow-[#005f3a]/20 transition-all duration-300 active:scale-95">
                  <Download className="w-4 h-4 mr-1.5" />
                  Get the App
                </Button>
              </a>
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="md:hidden flex items-center gap-2">
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  App
                </Button>
              </a>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Menu className="w-6 h-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="bg-[#111827] border-white/10 text-white w-[280px]"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">
                      <Logo variant="dark" showText size="sm" linkToHome={false} />
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 mt-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-[#22C55E] hover:bg-white/5 transition-colors text-base font-medium"
                      >
                        <ChevronRight className="w-4 h-4 text-[#22C55E]" />
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-white/10 my-3" />
                    <Link
                      href="/intellects/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-base font-medium"
                    >
                      <Shield className="w-4 h-4 text-gray-400" />
                      Admin Portal
                    </Link>
                    <a
                      href="https://play.google.com/store"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button className="w-full mt-4 bg-[#005f3a] hover:bg-[#0e7a4d] text-white">
                        <Download className="w-4 h-4 mr-2" />
                        Get the App
                      </Button>
                    </a>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated gradient background blobs */}
        <motion.div
          className="absolute top-1/4 left-1/6 w-[500px] h-[500px] bg-[#005f3a]/20 rounded-full blur-[160px]"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-[#22C55E]/10 rounded-full blur-[140px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0e7a4d]/8 rounded-full blur-[180px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 pt-12 pb-20 max-w-7xl mx-auto w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-6 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 px-4 py-1.5 text-sm font-medium">
                Uganda&apos;s #1 Mobility Platform
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight max-w-4xl mx-auto tracking-tight"
            >
              Your All-in-One Mobility
              <span className="block mt-2 bg-gradient-to-r from-[#22C55E] to-[#0e7a4d] bg-clip-text text-transparent">
                &amp; Delivery App
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg sm:text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              Book rides, order food, get items delivered, and shop from local stores — all from Uganda&apos;s smartest ride-hailing platform.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-[#005f3a]/25 transition-all duration-300 active:scale-95 h-auto">
                  <Download className="w-5 h-5 mr-2" />
                  Get the App
                </Button>
              </a>
              <Link href="/auth/signup">
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:text-white px-8 py-6 text-lg rounded-2xl transition-all duration-300 active:scale-95 h-auto bg-transparent"
                >
                  Become a Rider
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>

            {/* App mockup */}
            <motion.div
              variants={scaleIn}
              className="mt-16 flex justify-center"
            >
              <div className="relative w-[260px] sm:w-[300px] md:w-[340px]">
                <div className="absolute -inset-4 bg-gradient-to-t from-[#005f3a]/20 via-[#22C55E]/10 to-transparent rounded-3xl blur-xl" />
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
                  <Image
                    src="/images/app-mockup.png"
                    alt="Smart Ride App"
                    width={340}
                    height={453}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SERVICES GRID                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                Our Services
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
            >
              Everything You Need,
              <span className="block text-[#22C55E]">One App</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-gray-400 text-lg max-w-xl mx-auto"
            >
              Six powerful services designed for Uganda&apos;s vibrant cities.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {services.map((service, i) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className="group relative rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-6 hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${service.color}12, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${service.color}18` }}
                      >
                        <Icon
                          className="w-6 h-6"
                          style={{ color: service.color }}
                        />
                      </div>
                      <Badge className="bg-[#22C55E]/15 text-[#22C55E] border-0 text-xs font-semibold">
                        Active
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                      {service.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                How It Works
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
            >
              Get Started in
              <span className="text-[#22C55E]"> 4 Easy Steps</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  custom={i}
                  className="relative text-center group"
                >
                  {/* Connector line (hidden on last item and mobile) */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-gradient-to-r from-[#22C55E]/40 to-[#22C55E]/10" />
                  )}

                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#005f3a]/20 border border-[#22C55E]/20 mb-5 group-hover:bg-[#005f3a]/30 transition-colors duration-300">
                    <Icon className="w-8 h-8 text-[#22C55E]" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#22C55E] text-[#111827] text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-[240px] mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                Testimonials
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
            >
              Loved by
              <span className="text-[#22C55E]"> Thousands</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-6 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-[#22C55E] text-[#22C55E]"
                    />
                  ))}
                </div>
                <p className="text-lg text-gray-200 leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#005f3a] flex items-center justify-center text-sm font-bold text-[#22C55E]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DRIVER / RIDER CTA                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#0d1117] overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#005f3a]/15 rounded-full blur-[160px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                Drive With Us
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
            >
              Earn with
              <span className="text-[#22C55E]"> Smart Ride</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-gray-400 text-lg max-w-xl mx-auto"
            >
              Turn your motorcycle or car into a money-making machine. Join thousands of riders already earning on Smart Ride.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"
            >
              {[
                {
                  icon: DollarSign,
                  title: 'Competitive Earnings',
                  desc: 'Keep more of what you earn with our fair commission structure.',
                },
                {
                  icon: Clock,
                  title: 'Flexible Hours',
                  desc: 'Work when you want — full-time, part-time, or just weekends.',
                },
                {
                  icon: Users,
                  title: 'Growing Community',
                  desc: 'Join 10,000+ riders across Uganda with 24/7 support.',
                },
              ].map((benefit) => {
                const BIcon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#005f3a]/20 flex items-center justify-center mb-3">
                      <BIcon className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{benefit.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {benefit.desc}
                    </p>
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="mt-10">
              <Link href="/auth/signup">
                <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-[#005f3a]/25 transition-all duration-300 active:scale-95 h-auto">
                  Start Earning Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PAYMENT METHODS                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                Payments
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
            >
              Pay Your Way,
              <span className="text-[#22C55E]"> Your Way</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-gray-400 text-lg max-w-xl mx-auto"
            >
              Multiple secure payment options built for Uganda.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {paymentMethods.map((pm, i) => {
              const PIcon = pm.icon;
              return (
                <motion.div
                  key={pm.label}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-6 text-center hover:border-white/20 transition-all duration-300"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${pm.color}18` }}
                  >
                    <PIcon
                      className="w-7 h-7"
                      style={{ color: pm.color }}
                    />
                  </div>
                  <h3 className="font-bold text-lg mb-1">{pm.label}</h3>
                  <p className="text-gray-400 text-sm">{pm.description}</p>
                  <Badge className="mt-3 bg-[#22C55E]/15 text-[#22C55E] border-0 text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BLOG / NEWS & UPDATES                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="blog" className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#0d1117]">
        {/* Background glow */}
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#005f3a]/12 rounded-full blur-[160px] -translate-y-1/2" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                News & Updates
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
            >
              From Our
              <span className="text-[#22C55E]"> Blog</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-gray-400 text-lg max-w-xl mx-auto"
            >
              Product updates, policies, and stories from the Smart Ride community.
            </motion.p>
          </motion.div>

          {/* Featured post + side posts grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {blogPosts.map((post, i) => {
              const Icon = post.icon;
              const isFeatured = post.featured;
              return (
                <motion.article
                  key={post.id}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className={`group relative rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden hover:border-[#22C55E]/30 transition-all duration-300 ${
                    isFeatured ? 'lg:col-span-2' : ''
                  }`}
                >
                  {/* Gradient header banner */}
                  <div
                    className="relative h-32 sm:h-40 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${post.accent}22 0%, ${post.accent}08 60%, transparent 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-[#111827]/60 backdrop-blur-md text-white border border-white/10 text-xs font-semibold">
                        {post.category}
                      </Badge>
                    </div>
                    {isFeatured && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-[#22C55E] text-[#111827] border-0 text-xs font-bold">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    )}
                    {post.comingSoon && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 text-xs font-semibold">
                          Coming Soon
                        </Badge>
                      </div>
                    )}
                    {/* Big icon watermark */}
                    <Icon
                      className="absolute -bottom-4 right-4 w-24 h-24 opacity-15 group-hover:opacity-25 group-hover:scale-110 transition-all duration-500"
                      style={{ color: post.accent }}
                    />
                  </div>

                  {/* Body */}
                  <div className="p-6 sm:p-8">
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#22C55E]" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
                        {post.readTime}
                      </span>
                    </div>

                    <h3 className={`font-bold mb-3 group-hover:text-[#22C55E] transition-colors ${
                      isFeatured ? 'text-2xl sm:text-3xl' : 'text-xl'
                    }`}>
                      {post.title}
                    </h3>
                    <p className={`text-gray-400 leading-relaxed mb-6 ${
                      isFeatured ? 'text-base max-w-2xl' : 'text-sm'
                    }`}>
                      {post.excerpt}
                    </p>

                    {/* CTA */}
                    {post.comingSoon ? (
                      <div className="inline-flex items-center gap-2 text-gray-500 text-sm font-medium cursor-not-allowed">
                        <Lock className="w-4 h-4" />
                        Article coming soon
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActivePost(post)}
                        className="inline-flex items-center gap-2 text-[#22C55E] text-sm font-semibold hover:gap-3 transition-all duration-200"
                      >
                        Read Article
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ARTICLE READER DIALOG                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!activePost} onOpenChange={(open) => !open && setActivePost(null)}>
        <DialogContent className="bg-[#111827] border-white/10 text-white max-w-3xl sm:max-w-3xl w-[calc(100%-2rem)] p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
          {activePost && (() => {
            const Icon = activePost.icon;
            return (
              <>
                {/* Article header banner */}
                <div
                  className="relative shrink-0 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${activePost.accent}22 0%, ${activePost.accent}08 60%, transparent 100%)`,
                  }}
                >
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  <div className="relative p-6 sm:p-8 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-[#111827]/60 backdrop-blur-md text-white border border-white/10 text-xs font-semibold">
                        {activePost.category}
                      </Badge>
                      <Badge className="bg-[#22C55E]/15 text-[#22C55E] border-0 text-xs font-semibold">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${activePost.accent}18` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: activePost.accent }} />
                      </div>
                      <div className="min-w-0">
                        <DialogTitle className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                          {activePost.title}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Full article: {activePost.title}
                        </DialogDescription>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-3">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#22C55E]" />
                            {activePost.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
                            {activePost.readTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable article body */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-6 sm:px-8 py-6">
                    {/* Intro callout */}
                    <div className="rounded-xl bg-[#005f3a]/15 border border-[#22C55E]/20 p-4 mb-6 flex items-start gap-3">
                      <AlertTriangle className="shrink-0 w-5 h-5 text-[#22C55E] mt-0.5" />
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {activePost.excerpt}
                      </p>
                    </div>

                    {activePost.content?.map((block, i) => (
                      <BlogBlockRenderer key={i} block={block} />
                    ))}

                    {/* Contact footer inside article */}
                    <div className="mt-8 pt-6 border-t border-white/10 rounded-xl bg-white/5 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-4 h-4 text-[#22C55E]" />
                        <h4 className="font-semibold text-white text-sm">Need help?</h4>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                        For questions regarding account deletion or any other concern, our support team is ready to assist you.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <a href="mailto:support@smartride.ug">
                          <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white w-full sm:w-auto">
                            <Mail className="w-4 h-4 mr-2" />
                            support@smartride.ug
                          </Button>
                        </a>
                        <a href="https://smartride.ug" target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent w-full sm:w-auto">
                            <Globe className="w-4 h-4 mr-2" />
                            Visit Website
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="mt-auto bg-[#0a0f1a] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo variant="dark" showText linkToHome={false} size="sm" />
              <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-xs">
                Uganda&apos;s smartest ride-hailing and delivery platform. Fast, reliable, and affordable services at your fingertips.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mt-5">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#22C55E] hover:border-[#22C55E]/30 transition-all duration-200"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#22C55E] hover:border-[#22C55E]/30 transition-all duration-200"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#22C55E] hover:border-[#22C55E]/30 transition-all duration-200"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {footerLinks.quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-[#22C55E] transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">
                Contact
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[#22C55E]" />
                  <a
                    href="mailto:support@smartride.ug"
                    className="hover:text-[#22C55E] transition-colors"
                  >
                    support@smartride.ug
                  </a>
                </li>
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0 text-[#22C55E]" />
                  <a
                    href="tel:+256700123456"
                    className="hover:text-[#22C55E] transition-colors"
                  >
                    +256 700 123 456
                  </a>
                </li>
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#22C55E]" />
                  Kampala, Uganda
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-[#22C55E] transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2026 Smart Ride Uganda. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
