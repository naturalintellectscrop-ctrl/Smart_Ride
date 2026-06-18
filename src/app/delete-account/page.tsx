'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Smartphone,
  Settings,
  Mail,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Calendar,
  Globe,
  MapPin,
  ChevronRight,
  ArrowLeft,
  UserX,
  Lock,
  Database,
  Scale,
  RefreshCw,
} from 'lucide-react';

// ─── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Help', href: '/help' },
  { label: 'Contact', href: '/contact' },
];

const tocSections = [
  { id: 'how-to-delete', label: 'How to Delete Your Account' },
  { id: 'after-deletion', label: 'What Happens After Deletion' },
  { id: 'retained-info', label: 'Information That May Be Retained' },
  { id: 'retention-period', label: 'Retention Period' },
  { id: 'active-services', label: 'Effect on Active Services' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact' },
];

// Bullet list helper
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 ml-1">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-gray-300 text-[15px] leading-relaxed"
        >
          <CheckCircle2 className="shrink-0 w-5 h-5 text-[#22C55E] mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Section heading with green accent bar + icon
function SectionHeading({
  number,
  title,
  Icon,
}: {
  number: number;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold text-white scroll-mt-24">
      <span className="w-1.5 h-7 rounded-full bg-[#22C55E] shrink-0" />
      <Icon className="w-6 h-6 text-[#22C55E] shrink-0" />
      <span>
        <span className="text-[#22C55E] mr-2">{number}.</span>
        {title}
      </span>
    </h2>
  );
}

// Sub-heading (e.g. "In-App Deletion", "Support Request")
function SubHeading({
  label,
  Icon,
}: {
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h3 className="text-lg font-semibold text-[#22C55E] mt-6 mb-2 flex items-center gap-2">
      {Icon ? <Icon className="w-5 h-5" /> : <ChevronRight className="w-4 h-4" />}
      {label}
    </h3>
  );
}

// Ordered list with numbered circles (matching the blog's ordered list style)
function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 ml-1">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-gray-300 text-[15px] leading-relaxed"
        >
          <span className="shrink-0 w-6 h-6 rounded-full bg-[#005f3a]/40 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STICKY HEADER                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#111827]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo variant="dark" />

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

            <Link href="/">
              <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 px-4">
        {/* Decorative background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#22C55E]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-[#005f3a]/20 rounded-full blur-[100px]" />
        </div>

        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-6">
            <Badge
              variant="outline"
              className="bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] px-4 py-1.5 text-sm gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Account Deletion Policy
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
          >
            Smart Ride Account Deletion Policy
          </motion.h1>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-sm text-gray-400"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#22C55E]" />
              Effective Date:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
            <span className="hidden sm:inline w-px h-4 bg-white/20" />
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#22C55E]" />
              Last Updated:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-[#005f3a]/15 border border-[#22C55E]/20 rounded-2xl p-6 sm:p-8 text-left"
          >
            <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base">
              Smart Ride respects your right to control your personal
              information. This Account Deletion Policy explains how Smart Ride
              users may request account deletion and what happens to associated
              information after deletion.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABLE OF CONTENTS                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 pb-12">
        <motion.div
          className="max-w-3xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
        >
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#22C55E]" />
              <h2 className="text-lg font-semibold text-white">
                Table of Contents
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tocSections.map((section, i) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-[#22C55E] transition-colors duration-200 py-1.5 px-2 rounded-lg hover:bg-white/5"
                >
                  <span className="text-[#22C55E] font-semibold w-6 text-right">
                    {i + 1}.
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>{section.label}</span>
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 px-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* ── 1. How to Delete Your Account ──────────────────────────────── */}
          <motion.section
            id="how-to-delete"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={1}
              title="How to Delete Your Account"
              Icon={Trash2}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Users may delete their Smart Ride account through one of the
                following methods:
              </p>

              {/* In-App Deletion sub-section */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
                <SubHeading label="In-App Deletion" Icon={Smartphone} />
                <NumberedList
                  items={[
                    'Open the Smart Ride application.',
                    'Navigate to Profile.',
                    'Open Settings.',
                    'Select Delete Account.',
                    'Confirm your request.',
                    'Complete any required identity verification.',
                  ]}
                />
              </div>

              {/* Support Request sub-section */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
                <SubHeading label="Support Request" Icon={Mail} />
                <p className="text-gray-300 leading-relaxed mb-4">
                  Users may also request account deletion by contacting:
                </p>
                <a href="mailto:support@smartride.ug" className="inline-block">
                  <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white">
                    <Mail className="w-4 h-4 mr-2" />
                    support@smartride.ug
                  </Button>
                </a>
                <p className="text-gray-300 leading-relaxed mt-4">
                  Please include the phone number or email address associated
                  with your account.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── 2. What Happens After Deletion ─────────────────────────────── */}
          <motion.section
            id="after-deletion"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={2}
              title="What Happens After Deletion"
              Icon={UserX}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                When an account deletion request is approved:
              </p>
              <BulletList
                items={[
                  'Access to the account is removed.',
                  'Profile information is deleted or anonymized.',
                  'Login credentials become invalid.',
                  'Personal identifiers may be removed from active systems.',
                ]}
              />
            </div>
          </motion.section>

          {/* ── 3. Information That May Be Retained ───────────────────────── */}
          <motion.section
            id="retained-info"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={3}
              title="Information That May Be Retained"
              Icon={Database}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Certain information may be retained where permitted or required
                by law, including:
              </p>
              <BulletList
                items={[
                  'Transaction records',
                  'Ride and delivery records',
                  'Audit logs',
                  'Fraud prevention records',
                  'Security investigation records',
                  'Customer support records',
                  'Legal compliance records',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Such information will only be retained for legitimate business,
                legal, safety, or regulatory purposes.
              </p>
            </div>
          </motion.section>

          {/* ── 4. Retention Period ───────────────────────────────────────── */}
          <motion.section
            id="retention-period"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading number={4} title="Retention Period" Icon={Clock} />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Information retained after account deletion will be stored only
                for as long as necessary to:
              </p>
              <BulletList
                items={[
                  'Comply with legal obligations',
                  'Resolve disputes',
                  'Prevent fraud',
                  'Enforce agreements',
                  'Maintain security',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                After retention requirements expire, information will be deleted
                or anonymized.
              </p>
            </div>
          </motion.section>

          {/* ── 5. Effect on Active Services ──────────────────────────────── */}
          <motion.section
            id="active-services"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={5}
              title="Effect on Active Services"
              Icon={AlertTriangle}
            />
            <div className="mt-4 space-y-4">
              <div className="bg-[#005f3a]/10 border border-[#22C55E]/20 rounded-2xl p-5 sm:p-6">
                <p className="text-gray-200 leading-relaxed">
                  Accounts with active rides, deliveries, disputes,
                  investigations, or unresolved obligations may not be
                  immediately eligible for deletion until those matters are
                  resolved.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── 6. Changes to This Policy ─────────────────────────────────── */}
          <motion.section
            id="changes"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={6}
              title="Changes to This Policy"
              Icon={RefreshCw}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride may update this Account Deletion Policy from time to
                time.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Updated versions will be posted through the Smart Ride
                application or website.
              </p>
            </div>
          </motion.section>

          {/* ── 7. Contact ────────────────────────────────────────────────── */}
          <motion.section
            id="contact"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading number={7} title="Contact" Icon={Mail} />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                For questions regarding account deletion, contact:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                <p className="text-white font-semibold text-lg">
                  Smart Ride Support
                </p>
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="w-5 h-5 text-[#22C55E] shrink-0" />
                  <a
                    href="mailto:support@smartride.ug"
                    className="hover:text-[#22C55E] transition-colors"
                  >
                    support@smartride.ug
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Globe className="w-5 h-5 text-[#22C55E] shrink-0" />
                  <a
                    href="https://smartride.ug"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#22C55E] transition-colors"
                  >
                    https://smartride.ug
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 text-[#22C55E] shrink-0" />
                  <span>Kampala, Uganda</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER (sticky to bottom)                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="mt-auto bg-[#0a0f1a] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Contact card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 mb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Need help deleting your account?
                </h3>
                <p className="text-gray-400 text-sm">
                  Reach out to Smart Ride Support — we&rsquo;re here to help.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <a href="mailto:support@smartride.ug" className="block">
                  <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white w-full sm:w-auto">
                    <Mail className="w-4 h-4 mr-2" />
                    support@smartride.ug
                  </Button>
                </a>
                <a
                  href="https://smartride.ug"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Visit Website
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Links row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Logo variant="dark" />
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-[#22C55E] transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-[#22C55E] transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Smart Ride. All rights reserved.
              Kampala, Uganda.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
