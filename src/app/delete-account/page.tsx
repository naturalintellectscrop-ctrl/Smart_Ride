'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Reveal } from '@/components/marketing/Reveal';
import { PageToc } from '@/components/marketing/PageToc';
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
    <MarketingShell>
      <MarketingHeader />

      {/* Hero */}
      <section className="pt-4 pb-12">
        <Reveal className="text-center px-4">
          <div className="inline-flex items-center gap-2 bg-mkt-bg-raised border border-mkt-border rounded-full px-4 py-2 mb-6">
            <Trash2 className="w-4 h-4 text-mkt-accent" />
            <span className="text-mkt-fg-muted text-sm">Legal Document</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-mkt-fg leading-tight max-w-4xl mx-auto">
            Account Deletion Policy
          </h1>
          <p className="mt-4 text-mkt-fg-muted text-base max-w-2xl mx-auto">
            Last updated: June 2025 &middot; Smart Ride Uganda Limited
          </p>
        </Reveal>
      </section>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Back to Home */}
          <Link href="/" className="inline-flex items-center gap-2 text-mkt-fg-muted hover:text-mkt-accent text-sm font-medium transition-colors duration-200 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Table of Contents */}
          <Reveal>
            <PageToc sections={tocSections} />
          </Reveal>

          {/* Sections */}
          <div className="space-y-12">
            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">1. Introduction</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
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
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">2. How to Request Account Deletion</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>You can request account deletion using any of the following methods:</p>
                <div className="bg-mkt-bg-raised rounded-xl p-5 border border-mkt-border">
                  <p className="text-mkt-fg font-medium mb-2">Method 1 &mdash; In-App (Recommended)</p>
                  <p className="text-sm">
                    Open the Smart Ride app &rarr; go to <span className="text-mkt-fg">Profile</span> &rarr; tap <span className="text-mkt-fg">Delete Account</span> &rarr; confirm your password &rarr; tap <span className="text-mkt-fg">Delete Permanently</span>.
                  </p>
                </div>
                <div className="bg-mkt-bg-raised rounded-xl p-5 border border-mkt-border">
                  <p className="text-mkt-fg font-medium mb-2">Method 2 &mdash; Online</p>
                  <p className="text-sm">
                    Visit this page (<Link href="/delete-account" className="text-mkt-accent hover:underline">https://smartrideug.vercel.app/delete-account</Link>) and click the delete button below, or email us at <a href="mailto:support@smartride.ug" className="text-mkt-accent hover:underline">support@smartride.ug</a> with the subject &ldquo;Account Deletion Request&rdquo; and your registered phone number.
                  </p>
                </div>
                <div className="bg-mkt-bg-raised rounded-xl p-5 border border-mkt-border">
                  <p className="text-mkt-fg font-medium mb-2">Method 3 &mdash; By Phone</p>
                  <p className="text-sm">
                    Call our support line and verify your identity. A support agent will process your deletion request.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. What Happens */}
            <section id="what-happens" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <UserX className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">3. What Happens When You Delete Your Account</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>When you request account deletion, the following occurs immediately:</p>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Your account is <span className="text-mkt-fg">deactivated</span> &mdash; you cannot log in or use any Smart Ride services.</li>
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
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">4. Data Retained for Legal Obligations</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Some data cannot be deleted immediately due to legal and regulatory obligations under Ugandan law. This data is retained in an anonymized or aggregated form and is kept secure:
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><span className="text-mkt-fg">Transaction records</span> &mdash; kept for 7 years as required by the Uganda Revenue Authority (URA) for tax audit purposes.</li>
                  <li><span className="text-mkt-fg">Fraud prevention records</span> &mdash; kept for up to 5 years to prevent abuse, chargebacks, and fraudulent re-registration.</li>
                  <li><span className="text-mkt-fg">Court-ordered records</span> &mdash; kept for the duration specified by any valid court order or law enforcement request.</li>
                  <li><span className="text-mkt-fg">Anonymized analytics</span> &mdash; aggregated, non-identifiable data used for service improvement may be retained indefinitely.</li>
                </ul>
                <p>
                  Retained data is stored securely and access is restricted to authorized personnel only. It is never used for marketing or sold to third parties.
                </p>
              </div>
            </section>

            {/* 5. Wallet Balance */}
            <section id="wallet-balance" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">5. Wallet Balance</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  <strong className="text-mkt-fg">Important:</strong> Any remaining Smart Ride wallet balance must be <span className="text-mkt-accent">withdrawn BEFORE</span> you request account deletion.
                </p>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5">
                  <p className="text-orange-500 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Unclaimed wallet balances remaining after account deletion are <strong>forfeited</strong> and cannot be recovered. Please withdraw your full balance to your MTN MoMo or Airtel Money account before proceeding.
                  </p>
                </div>
                <p>
                  To withdraw: Open the app &rarr; Wallet &rarr; Withdraw &rarr; enter amount &rarr; select mobile money provider &rarr; confirm. If you cannot access your account, contact <a href="mailto:support@smartride.ug" className="text-mkt-accent hover:underline">support@smartride.ug</a> to arrange a manual withdrawal before deletion.
                </p>
              </div>
            </section>

            {/* 6. Active Orders */}
            <section id="active-orders" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">6. Active Rides &amp; Orders</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  You <strong className="text-mkt-fg">cannot</strong> delete your account if you have any active rides, pending orders, or in-progress deliveries. You must first:
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
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">7. Recovery Window</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Account deletion is not immediate. There is a <strong className="text-mkt-fg">30-day recovery window</strong> during which you can cancel the deletion request and restore your account.
                </p>
                <p>
                  To cancel a pending deletion, log in with your credentials (still active during the window) or contact <a href="mailto:support@smartride.ug" className="text-mkt-accent hover:underline">support@smartride.ug</a> with your registered phone number and a valid reason for cancellation.
                </p>
                <p>
                  After the 30-day window expires, the account and associated personal data are <strong className="text-mkt-fg">permanently deleted</strong> and cannot be recovered by any means.
                </p>
              </div>
            </section>

            {/* 8. Connected Accounts */}
            <section id="connected-accounts" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">8. Impact on Connected Accounts</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  If your phone number is linked to multiple Smart Ride account types (e.g., a rider account and a driver/merchant account), deleting one account type may affect the others:
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><span className="text-mkt-fg">Rider account deletion</span> does not automatically delete a linked driver or merchant account, but shared data (saved addresses, payment methods) will be removed.</li>
                  <li><span className="text-mkt-fg">Driver/merchant account deletion</span> requires settling all pending payouts and resolving active orders first.</li>
                  <li><span className="text-mkt-fg">Complete deletion</span> (all account types) requires separate confirmation for each type.</li>
                </ul>
              </div>
            </section>

            {/* 9. Timeline */}
            <section id="timeline" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">9. Deletion Timeline</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <div className="overflow-hidden rounded-xl border border-mkt-border">
                  <table className="w-full text-sm">
                    <thead className="bg-mkt-bg-raised">
                      <tr>
                        <th className="text-left p-4 text-mkt-fg font-medium">Stage</th>
                        <th className="text-left p-4 text-mkt-fg font-medium">Timeframe</th>
                        <th className="text-left p-4 text-mkt-fg font-medium">What Happens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-4 text-mkt-fg-muted">1. Deactivation</td>
                        <td className="p-4 text-mkt-fg">Immediate</td>
                        <td className="p-4 text-mkt-fg-muted">Account disabled, login blocked</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-mkt-fg-muted">2. Recovery Window</td>
                        <td className="p-4 text-mkt-fg">Days 1&ndash;30</td>
                        <td className="p-4 text-mkt-fg-muted">Account can be restored on request</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-mkt-fg-muted">3. Permanent Deletion</td>
                        <td className="p-4 text-mkt-fg">Day 30</td>
                        <td className="p-4 text-mkt-fg-muted">Personal data permanently erased</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-mkt-fg-muted">4. Data Purge Complete</td>
                        <td className="p-4 text-mkt-fg">Days 30&ndash;90</td>
                        <td className="p-4 text-mkt-fg-muted">Backups and cache fully purged</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 10. Contact */}
            <section id="contact" className="scroll-mt-24">
              <Reveal amount={0.15} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-mkt-accent" />
                </div>
                <h2 className="text-2xl font-bold text-mkt-fg">10. Contact Us</h2>
              </Reveal>
              <div className="text-mkt-fg-muted leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  If you have any questions about account deletion, our privacy practices, or need help with the deletion process, our support team is here to help.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href="mailto:support@smartride.ug"
                    className="flex items-center gap-3 bg-mkt-bg-raised rounded-xl p-4 border border-mkt-border hover:border-mkt-accent/30 transition-colors duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-mkt-accent" />
                    </div>
                    <div>
                      <p className="text-mkt-fg-faint text-xs">Email</p>
                      <p className="text-mkt-fg text-sm font-medium">support@smartride.ug</p>
                    </div>
                  </a>
                  <a
                    href="https://smartrideug.vercel.app"
                    className="flex items-center gap-3 bg-mkt-bg-raised rounded-xl p-4 border border-mkt-border hover:border-mkt-accent/30 transition-colors duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-mkt-accent/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-mkt-accent" />
                    </div>
                    <div>
                      <p className="text-mkt-fg-faint text-xs">Website</p>
                      <p className="text-mkt-fg text-sm font-medium">smartrideug.vercel.app</p>
                    </div>
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Back to Home */}
          <div className="mt-16 pt-8 border-t border-mkt-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-mkt-fg-faint text-sm">
              Effective Date: June 2025 &middot; &copy; {new Date().getFullYear()} Smart Ride Uganda Limited
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-mkt-fg-faint hover:text-mkt-accent text-sm transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-mkt-fg-faint hover:text-mkt-accent text-sm transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 text-mkt-fg-muted hover:text-mkt-accent text-sm font-medium transition-colors duration-200">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </MarketingShell>
  );
}
