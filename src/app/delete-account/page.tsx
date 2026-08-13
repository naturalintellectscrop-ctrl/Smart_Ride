'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Trash2,
  UserX,
  Clock,
  Wallet,
  AlertTriangle,
  ShieldCheck,
  Database,
  RotateCcw,
  Users,
  Mail,
  Globe,
  ArrowLeft,
  FileText,
} from 'lucide-react';

const tocSections = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'how-to-delete', label: 'How to Delete Your Account' },
  { id: 'what-happens', label: 'What Happens When You Delete' },
  { id: 'data-retained', label: 'Data Retained for Legal Obligations' },
  { id: 'wallet-balance', label: 'Wallet Balance' },
  { id: 'active-orders', label: 'Active Rides & Orders' },
  { id: 'recovery', label: 'Recovery Window' },
  { id: 'connected-accounts', label: 'Connected Accounts' },
  { id: 'timeline', label: 'Deletion Timeline' },
  { id: 'contact', label: 'Contact Us' },
];

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D12] font-['Inter',sans-serif]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D12]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Home</Link>
              <Link href="/about" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">About</Link>
              <Link href="/help" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Help</Link>
              <Link href="/contact" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Contact</Link>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-12">
        <div className="text-center px-4">
          <div className="inline-flex items-center gap-2 bg-[#1A1A1F] border border-white/10 rounded-full px-4 py-2 mb-6">
            <Trash2 className="w-4 h-4 text-[#00FF88]" />
            <span className="text-white/60 text-sm">Legal Document</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-4xl mx-auto">
            Account Deletion Policy
          </h1>
          <p className="mt-4 text-white/50 text-base max-w-2xl mx-auto">
            Last updated: June 2025 &middot; Smart Ride Uganda Limited
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Back to Home */}
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-[#00FF88] text-sm font-medium transition-colors duration-200 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Table of Contents */}
          <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 mb-12">
            <h2 className="text-lg font-semibold text-white mb-4">Table of Contents</h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tocSections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 text-white/50 hover:text-[#00FF88] text-sm transition-colors duration-200 py-1"
                >
                  <span className="text-[#00FF88]/60 font-mono text-xs w-5">{index + 1}.</span>
                  {section.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Smart Ride respects your right to control your personal data. This Account Deletion Policy explains what happens when you request to delete your Smart Ride account, what data is removed, what data is retained for legal obligations, and how long the process takes.
                </p>
                <p>
                  This policy applies to all Smart Ride users &mdash; riders, drivers, merchants, and pharmacists. By requesting account deletion, you acknowledge that you have read and understood this policy.
                </p>
              </div>
            </section>

            {/* 2. How to Delete */}
            <section id="how-to-delete" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">2. How to Request Account Deletion</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>You can request account deletion using any of the following methods:</p>
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <p className="text-white/80 font-medium mb-2">Method 1 &mdash; In-App (Recommended)</p>
                  <p className="text-sm">
                    Open the Smart Ride app &rarr; go to <span className="text-white">Profile</span> &rarr; tap <span className="text-white">Delete Account</span> &rarr; confirm your password &rarr; tap <span className="text-white">Delete Permanently</span>.
                  </p>
                </div>
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <p className="text-white/80 font-medium mb-2">Method 2 &mdash; Online</p>
                  <p className="text-sm">
                    Visit this page (<Link href="/delete-account" className="text-[#00FF88] hover:underline">https://smartrideug.vercel.app/delete-account</Link>) and click the delete button below, or email us at <a href="mailto:support@smartride.ug" className="text-[#00FF88] hover:underline">support@smartride.ug</a> with the subject &ldquo;Account Deletion Request&rdquo; and your registered phone number.
                  </p>
                </div>
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <p className="text-white/80 font-medium mb-2">Method 3 &mdash; By Phone</p>
                  <p className="text-sm">
                    Call our support line and verify your identity. A support agent will process your deletion request.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. What Happens */}
            <section id="what-happens" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <UserX className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">3. What Happens When You Delete Your Account</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>When you request account deletion, the following occurs immediately:</p>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Your account is <span className="text-white">deactivated</span> &mdash; you cannot log in or use any Smart Ride services.</li>
                  <li>Your profile information (name, email, phone number, profile photo) is scheduled for permanent deletion.</li>
                  <li>You lose access to all Smart Ride features, including ride-hailing, delivery, shopping, health services, and wallet.</li>
                </ul>
                <p>Within 30 days, the following data is permanently deleted:</p>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Ride history and trip details</li>
                  <li>Saved addresses and favorite locations</li>
                  <li>Payment method tokens (MTN MoMo, Airtel Money, cards via Nylon Pay)</li>
                  <li>Chat and message history with drivers, merchants, and support</li>
                  <li>Notification preferences and device tokens</li>
                  <li>Search history and app usage analytics</li>
                </ul>
              </div>
            </section>

            {/* 4. Data Retained */}
            <section id="data-retained" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">4. Data Retained for Legal Obligations</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Some data cannot be deleted immediately due to legal and regulatory obligations under Ugandan law. This data is retained in an anonymized or aggregated form and is kept secure:
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><span className="text-white">Transaction records</span> &mdash; kept for 7 years as required by the Uganda Revenue Authority (URA) for tax audit purposes.</li>
                  <li><span className="text-white">Fraud prevention records</span> &mdash; kept for up to 5 years to prevent abuse, chargebacks, and fraudulent re-registration.</li>
                  <li><span className="text-white">Court-ordered records</span> &mdash; kept for the duration specified by any valid court order or law enforcement request.</li>
                  <li><span className="text-white">Anonymized analytics</span> &mdash; aggregated, non-identifiable data used for service improvement may be retained indefinitely.</li>
                </ul>
                <p>
                  Retained data is stored securely and access is restricted to authorized personnel only. It is never used for marketing or sold to third parties.
                </p>
              </div>
            </section>

            {/* 5. Wallet Balance */}
            <section id="wallet-balance" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">5. Wallet Balance</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  <strong className="text-white/80">Important:</strong> Any remaining Smart Ride wallet balance must be <span className="text-[#00FF88]">withdrawn BEFORE</span> you request account deletion.
                </p>
                <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-xl p-5">
                  <p className="text-[#FFB088] text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Unclaimed wallet balances remaining after account deletion are <strong>forfeited</strong> and cannot be recovered. Please withdraw your full balance to your MTN MoMo or Airtel Money account before proceeding.
                  </p>
                </div>
                <p>
                  To withdraw: Open the app &rarr; Wallet &rarr; Withdraw &rarr; enter amount &rarr; select mobile money provider &rarr; confirm. If you cannot access your account, contact <a href="mailto:support@smartride.ug" className="text-[#00FF88] hover:underline">support@smartride.ug</a> to arrange a manual withdrawal before deletion.
                </p>
              </div>
            </section>

            {/* 6. Active Orders */}
            <section id="active-orders" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">6. Active Rides &amp; Orders</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  You <strong className="text-white/80">cannot</strong> delete your account if you have any active rides, pending orders, or in-progress deliveries. You must first:
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Complete or cancel any active rides</li>
                  <li>Receive or cancel any pending food/shopping orders</li>
                  <li>Wait for any in-progress deliveries to complete</li>
                  <li>Resolve any open disputes or payment issues</li>
                </ul>
                <p>
                  Once all active services are resolved, you may proceed with account deletion.
                </p>
              </div>
            </section>

            {/* 7. Recovery */}
            <section id="recovery" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">7. Recovery Window</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Account deletion is not immediate. There is a <strong className="text-white/80">30-day recovery window</strong> during which you can cancel the deletion request and restore your account.
                </p>
                <p>
                  To cancel a pending deletion, log in with your credentials (still active during the window) or contact <a href="mailto:support@smartride.ug" className="text-[#00FF88] hover:underline">support@smartride.ug</a> with your registered phone number and a valid reason for cancellation.
                </p>
                <p>
                  After the 30-day window expires, the account and associated personal data are <strong className="text-white/80">permanently deleted</strong> and cannot be recovered by any means.
                </p>
              </div>
            </section>

            {/* 8. Connected Accounts */}
            <section id="connected-accounts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">8. Impact on Connected Accounts</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  If your phone number is linked to multiple Smart Ride account types (e.g., a rider account and a driver/merchant account), deleting one account type may affect the others:
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><span className="text-white">Rider account deletion</span> does not automatically delete a linked driver or merchant account, but shared data (saved addresses, payment methods) will be removed.</li>
                  <li><span className="text-white">Driver/merchant account deletion</span> requires settling all pending payouts and resolving active orders first.</li>
                  <li><span className="text-white">Complete deletion</span> (all account types) requires separate confirmation for each type.</li>
                </ul>
              </div>
            </section>

            {/* 9. Timeline */}
            <section id="timeline" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">9. Deletion Timeline</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <div className="overflow-hidden rounded-xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1A1A1F]">
                      <tr>
                        <th className="text-left p-4 text-white/80 font-medium">Stage</th>
                        <th className="text-left p-4 text-white/80 font-medium">Timeframe</th>
                        <th className="text-left p-4 text-white/80 font-medium">What Happens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-4 text-white/70">1. Deactivation</td>
                        <td className="p-4 text-white">Immediate</td>
                        <td className="p-4 text-white/50">Account disabled, login blocked</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-white/70">2. Recovery Window</td>
                        <td className="p-4 text-white">Days 1&ndash;30</td>
                        <td className="p-4 text-white/50">Account can be restored on request</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-white/70">3. Permanent Deletion</td>
                        <td className="p-4 text-white">Day 30</td>
                        <td className="p-4 text-white/50">Personal data permanently erased</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-white/70">4. Data Purge Complete</td>
                        <td className="p-4 text-white">Days 30&ndash;90</td>
                        <td className="p-4 text-white/50">Backups and cache fully purged</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 10. Contact */}
            <section id="contact" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">10. Contact Us</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  If you have any questions about account deletion, our privacy practices, or need help with the deletion process, our support team is here to help.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href="mailto:support@smartride.ug"
                    className="flex items-center gap-3 bg-[#1A1A1F] rounded-xl p-4 border border-white/5 hover:border-[#00FF88]/30 transition-colors duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Email</p>
                      <p className="text-white text-sm font-medium">support@smartride.ug</p>
                    </div>
                  </a>
                  <a
                    href="https://smartrideug.vercel.app"
                    className="flex items-center gap-3 bg-[#1A1A1F] rounded-xl p-4 border border-white/5 hover:border-[#00FF88]/30 transition-colors duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Website</p>
                      <p className="text-white text-sm font-medium">smartrideug.vercel.app</p>
                    </div>
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Back to Home */}
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">
              Effective Date: June 2025 &middot; &copy; {new Date().getFullYear()} Smart Ride Uganda Limited
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-white/40 hover:text-[#00FF88] text-sm transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-white/40 hover:text-[#00FF88] text-sm transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-[#00FF88] text-sm font-medium transition-colors duration-200">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="mt-auto bg-[#0A0A0F] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" showText={false} />
              <span className="text-white/30 text-sm">&copy; {new Date().getFullYear()} Smart Ride Uganda. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-white/40 hover:text-white transition-colors duration-200">Privacy Policy</Link>
              <Link href="/terms" className="text-white/40 hover:text-white transition-colors duration-200">Terms</Link>
              <Link href="/delete-account" className="text-white/40 hover:text-white transition-colors duration-200">Delete Account</Link>
              <Link href="/" className="text-white/40 hover:text-white transition-colors duration-200">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
