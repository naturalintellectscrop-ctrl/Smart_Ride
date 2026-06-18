'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Calendar,
  Clock,
  Mail,
  Globe,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  FileText,
  Lock,
  UserCircle,
  CreditCard,
  Smartphone,
  BarChart3,
  MessageSquare,
  Eye,
  Share2,
  Baby,
  Building2,
  Scale,
  MapPin,
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
  { id: 'about', label: 'About Smart Ride' },
  { id: 'information-we-collect', label: 'Information We Collect' },
  { id: 'how-we-use-information', label: 'How We Use Information' },
  { id: 'legal-basis', label: 'Legal Basis for Processing' },
  { id: 'how-information-is-shared', label: 'How Information Is Shared' },
  { id: 'data-security', label: 'Data Security' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'account-deletion', label: 'Account Deletion' },
  { id: 'childrens-privacy', label: "Children's Privacy" },
  { id: 'international-data-transfers', label: 'International Data Transfers' },
  { id: 'third-party-services', label: 'Third-Party Services' },
  { id: 'changes', label: 'Changes to This Privacy Policy' },
  { id: 'contact-us', label: 'Contact Us' },
  { id: 'data-safety-statement', label: 'Data Safety Statement' },
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

// Sub-heading A/B/C/D
function SubHeading({ label }: { label: string }) {
  return (
    <h3 className="text-lg font-semibold text-[#22C55E] mt-6 mb-2 flex items-center gap-2">
      <ChevronRight className="w-4 h-4" />
      {label}
    </h3>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
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
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
          >
            Smart Ride Privacy Policy
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
              <Clock className="w-4 h-4 text-[#22C55E]" />
              Last Updated:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-[#005f3a]/15 border border-[#22C55E]/20 rounded-2xl p-6 sm:p-8 text-left"
          >
            <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base">
              Smart Ride (&ldquo;Smart Ride&rdquo;, &ldquo;we&rdquo;,
              &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting
              your privacy and safeguarding your personal information. This
              Privacy Policy explains how we collect, use, store, share, and
              protect information when you use the Smart Ride mobile
              application, website, and related services.
            </p>
            <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base mt-4">
              By using Smart Ride, you agree to the practices described in this
              Privacy Policy.
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
          {/* ── 1. About Smart Ride ─────────────────────────────────────────── */}
          <motion.section
            id="about"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={1}
              title="About Smart Ride"
              Icon={Building2}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride is a technology platform that connects customers with
                transportation and delivery service providers. Services may
                include:
              </p>
              <BulletList
                items={[
                  'Ride-hailing',
                  'Food delivery',
                  'Shopping delivery',
                  'Parcel delivery',
                  'Health and pharmacy item delivery',
                  'Other logistics services offered through the platform',
                ]}
              />
            </div>
          </motion.section>

          {/* ── 2. Information We Collect ───────────────────────────────────── */}
          <motion.section
            id="information-we-collect"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={2}
              title="Information We Collect"
              Icon={Eye}
            />
            <div className="mt-4 space-y-4">
              {/* A */}
              <div>
                <SubHeading label="A. Information You Provide" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  When creating an account or using Smart Ride, we may collect:
                </p>
                <BulletList
                  items={[
                    'Full name',
                    'Phone number',
                    'Email address',
                    'Profile photograph (optional)',
                    'Account credentials',
                    'Emergency contact information (if provided)',
                    'Support requests and communications',
                  ]}
                />
              </div>

              {/* B */}
              <div>
                <SubHeading label="B. Location Information" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  To provide Smart Ride services, we collect:
                </p>
                <BulletList
                  items={[
                    'Precise GPS location',
                    'Pickup locations',
                    'Destination locations',
                    'Route information',
                    'Real-time trip location data during active services',
                  ]}
                />
                <p className="text-gray-300 leading-relaxed mt-3">
                  Location collection may occur while the application is open and
                  actively being used.
                </p>
              </div>

              {/* C */}
              <div>
                <SubHeading label="C. Service Information" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  We collect information related to services requested through
                  Smart Ride, including:
                </p>
                <BulletList
                  items={[
                    'Ride requests',
                    'Delivery requests',
                    'Shopping orders',
                    'Health delivery requests',
                    'Order details',
                    'Service history',
                    'Ratings and reviews',
                  ]}
                />
              </div>

              {/* D */}
              <div>
                <SubHeading label="D. Device Information" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  We may automatically collect:
                </p>
                <BulletList
                  items={[
                    'Device model',
                    'Operating system',
                    'App version',
                    'Device identifiers',
                    'IP address',
                    'Network information',
                    'Crash reports',
                    'Diagnostic information',
                  ]}
                />
              </div>

              {/* E */}
              <div>
                <SubHeading label="E. Communications" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  We may collect:
                </p>
                <BulletList
                  items={[
                    'In-app chat messages',
                    'Customer support communications',
                    'Feedback submissions',
                    'Service-related notifications',
                  ]}
                />
              </div>
            </div>
          </motion.section>

          {/* ── 3. How We Use Information ──────────────────────────────────── */}
          <motion.section
            id="how-we-use-information"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={3}
              title="How We Use Information"
              Icon={BarChart3}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">We use information to:</p>
              <BulletList
                items={[
                  'Create and manage user accounts',
                  'Match customers with riders and drivers',
                  'Provide transportation and delivery services',
                  'Calculate routes and fares',
                  'Enable communication between users and service providers',
                  'Improve service quality',
                  'Prevent fraud and abuse',
                  'Verify identities',
                  'Maintain platform security',
                  'Respond to support requests',
                  'Comply with legal obligations',
                ]}
              />
            </div>
          </motion.section>

          {/* ── 4. Legal Basis for Processing ──────────────────────────────── */}
          <motion.section
            id="legal-basis"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={4}
              title="Legal Basis for Processing"
              Icon={Scale}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Where applicable, we process information based on:
              </p>
              <BulletList
                items={[
                  'User consent',
                  'Performance of a contract',
                  'Legitimate business interests',
                  'Compliance with legal obligations',
                  'Protection of users and public safety',
                ]}
              />
            </div>
          </motion.section>

          {/* ── 5. How Information Is Shared ───────────────────────────────── */}
          <motion.section
            id="how-information-is-shared"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={5}
              title="How Information Is Shared"
              Icon={Share2}
            />
            <div className="mt-4 space-y-4">
              {/* A */}
              <div>
                <SubHeading label="A. With Drivers and Delivery Personnel" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  To complete services, we may share:
                </p>
                <BulletList
                  items={[
                    'Customer name',
                    'Pickup location',
                    'Drop-off location',
                    'Contact information necessary to complete the service',
                  ]}
                />
              </div>

              {/* B */}
              <div>
                <SubHeading label="B. With Customers" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  Customers may receive:
                </p>
                <BulletList
                  items={[
                    'Driver or rider name',
                    'Profile photo',
                    'Vehicle information',
                    'Service status updates',
                  ]}
                />
              </div>

              {/* C */}
              <div>
                <SubHeading label="C. Service Providers" />
                <p className="text-gray-300 leading-relaxed mb-3">
                  We may share information with trusted third-party providers
                  that help operate Smart Ride, including:
                </p>
                <BulletList
                  items={[
                    'Cloud hosting providers',
                    'Mapping and navigation providers',
                    'Authentication providers',
                    'Analytics providers',
                    'Communication providers',
                  ]}
                />
              </div>

              {/* D */}
              <div>
                <SubHeading label="D. Legal Requirements" />
                <p className="text-gray-300 leading-relaxed">
                  We may disclose information when required by law, regulation,
                  court order, or government request.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── 6. Data Security ───────────────────────────────────────────── */}
          <motion.section
            id="data-security"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading number={6} title="Data Security" Icon={Lock} />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We implement reasonable administrative, technical, and
                organizational safeguards designed to protect personal
                information from:
              </p>
              <BulletList
                items={[
                  'Unauthorized access',
                  'Loss',
                  'Misuse',
                  'Disclosure',
                  'Alteration',
                  'Destruction',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                However, no system can guarantee complete security.
              </p>
            </div>
          </motion.section>

          {/* ── 7. Data Retention ──────────────────────────────────────────── */}
          <motion.section
            id="data-retention"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading number={7} title="Data Retention" Icon={Clock} />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We retain information only for as long as necessary to:
              </p>
              <BulletList
                items={[
                  'Provide services',
                  'Maintain business records',
                  'Resolve disputes',
                  'Prevent fraud',
                  'Comply with legal obligations',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Retention periods may vary depending on the type of information.
              </p>
            </div>
          </motion.section>

          {/* ── 8. Your Rights ─────────────────────────────────────────────── */}
          <motion.section
            id="your-rights"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading number={8} title="Your Rights" Icon={UserCircle} />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Subject to applicable law, users may:
              </p>
              <BulletList
                items={[
                  'Access their information',
                  'Update account information',
                  'Request correction of inaccurate information',
                  'Request deletion of their account',
                  'Request a copy of certain personal information',
                  'Object to certain processing activities',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Requests may be submitted through our support channels.
              </p>
            </div>
          </motion.section>

          {/* ── 9. Account Deletion ────────────────────────────────────────── */}
          <motion.section
            id="account-deletion"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={9}
              title="Account Deletion"
              Icon={FileText}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Users may request deletion of their Smart Ride account.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Upon verification of the request:
              </p>
              <BulletList
                items={[
                  'Account access may be disabled',
                  'Personal information may be deleted or anonymized',
                  'Certain records may be retained where required by law, fraud prevention, dispute resolution, or business obligations',
                ]}
              />
            </div>
          </motion.section>

          {/* ── 10. Children's Privacy ─────────────────────────────────────── */}
          <motion.section
            id="childrens-privacy"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={10}
              title="Children's Privacy"
              Icon={Baby}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride is not intended for children under the age permitted
                by applicable law.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We do not knowingly collect personal information from children.
              </p>
              <p className="text-gray-300 leading-relaxed">
                If we become aware that information has been collected from a
                child without appropriate authorization, we will take reasonable
                steps to delete it.
              </p>
            </div>
          </motion.section>

          {/* ── 11. International Data Transfers ───────────────────────────── */}
          <motion.section
            id="international-data-transfers"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={11}
              title="International Data Transfers"
              Icon={Globe}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Information may be processed and stored in countries where Smart
                Ride or its service providers operate.
              </p>
              <p className="text-gray-300 leading-relaxed">
                By using Smart Ride, you understand that information may be
                transferred across borders where permitted by law.
              </p>
            </div>
          </motion.section>

          {/* ── 12. Third-Party Services ───────────────────────────────────── */}
          <motion.section
            id="third-party-services"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={12}
              title="Third-Party Services"
              Icon={Share2}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride may contain links to third-party websites or services.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We are not responsible for the privacy practices of third
                parties.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Users should review the privacy policies of those services
                separately.
              </p>
            </div>
          </motion.section>

          {/* ── 13. Changes to This Privacy Policy ─────────────────────────── */}
          <motion.section
            id="changes"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={13}
              title="Changes to This Privacy Policy"
              Icon={Clock}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy periodically.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Updated versions will be posted within the application, on our
                website, or through other appropriate channels.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Continued use of Smart Ride after updates become effective
                constitutes acceptance of the revised Privacy Policy.
              </p>
            </div>
          </motion.section>

          {/* ── 14. Contact Us ─────────────────────────────────────────────── */}
          <motion.section
            id="contact-us"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading number={14} title="Contact Us" Icon={Mail} />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                For privacy questions, requests, or concerns, contact:
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

          {/* ── 15. Data Safety Statement ──────────────────────────────────── */}
          <motion.section
            id="data-safety-statement"
            className="scroll-mt-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <SectionHeading
              number={15}
              title="Data Safety Statement"
              Icon={Shield}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride does not sell personal information to third parties.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Personal information is collected and used solely for operating,
                improving, securing, and supporting Smart Ride services.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Location data, account information, communications, and service
                history are processed only as necessary to provide requested
                services and maintain platform functionality.
              </p>
              <div className="bg-[#005f3a]/15 border border-[#22C55E]/20 rounded-2xl p-6 mt-6">
                <p className="text-gray-200 leading-relaxed font-medium">
                  By using Smart Ride, you acknowledge that you have read and
                  understood this Privacy Policy.
                </p>
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
                  Questions about your privacy?
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
                href="/terms"
                className="text-gray-400 hover:text-[#22C55E] transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/delete-account"
                className="text-gray-400 hover:text-[#22C55E] transition-colors"
              >
                Delete Account
              </Link>
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-[#22C55E] transition-colors"
              >
                Privacy Policy
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
