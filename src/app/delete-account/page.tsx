import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import {
  Trash2,
  Smartphone,
  Settings,
  Mail,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  UserX,
  Lock,
  Database,
  Scale,
  RefreshCw,
  Wallet,
  Link2,
  FileText,
  ArrowLeft,
  XCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Account Deletion Policy | Smart Ride',
  description:
    'Smart Ride Account Deletion Policy — how to request account deletion, what happens to your data, retention timelines, wallet balance rules, and your rights under Ugandan law.',
  alternates: {
    canonical: 'https://smartrideug.vercel.app/delete-account',
  },
  openGraph: {
    title: 'Account Deletion Policy | Smart Ride',
    description:
      'How to delete your Smart Ride account, what data is removed, and what is retained for legal compliance.',
    url: 'https://smartrideug.vercel.app/delete-account',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 ml-1 mt-3">
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

function WarningList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 ml-1 mt-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-gray-200 text-[15px] leading-relaxed"
        >
          <XCircle className="shrink-0 w-5 h-5 text-red-400 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

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
    <h2
      id={`section-${number}`}
      className="border-l-4 border-[#22C55E] pl-4 flex items-center gap-3 text-2xl sm:text-3xl font-bold text-white scroll-mt-24"
    >
      <Icon className="w-6 h-6 text-[#22C55E] shrink-0" />
      <span>
        <span className="text-[#22C55E] mr-2">{number}.</span>
        {title}
      </span>
    </h2>
  );
}

function SubHeading({
  label,
  Icon,
}: {
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h3 className="text-base sm:text-lg font-semibold text-[#22C55E] mt-6 mb-1 flex items-center gap-2">
      {Icon ? <Icon className="w-5 h-5" /> : <ChevronRight className="w-4 h-4" />}
      {label}
    </h3>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 ml-1 mt-3">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col">
      {/* ═══════ STICKY HEADER ═══════ */}
      <header className="sticky top-0 z-50 bg-[#111827]/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo variant="dark" />
            <Link href="/">
              <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden py-16 px-4">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#22C55E]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-[#005f3a]/20 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Badge
              variant="outline"
              className="bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] px-4 py-1.5 text-sm gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Account Deletion Policy
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Smart Ride Account Deletion Policy
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#22C55E]" />
              Effective Date:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
            <span className="hidden sm:inline w-px h-4 bg-white/20" />
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#22C55E]" />
              Last Updated:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
          </div>

          <Card className="bg-[#005f3a]/15 border-[#22C55E]/20 text-left">
            <CardContent>
              <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base">
                Smart Ride respects your right to control your personal
                information and to delete your account at any time. This
                Account Deletion Policy explains what happens when you request
                account deletion, what data is removed, what data is retained
                for legal obligations, and the timelines involved.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="flex-1 px-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* ── 1. Introduction ───────────────────────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={1}
              title="Introduction"
              Icon={FileText}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride, operated by Natural Intellects Corp, is committed
                to respecting your privacy and your right to be forgotten. This
                policy explains the process and consequences of deleting your
                Smart Ride account.
              </p>
              <p className="text-gray-300 leading-relaxed">
                This policy complies with the Uganda Data Protection and
                Privacy Act, 2019, and applies to all user accounts including
                customers, driver-partners, merchants, and pharmacy partners.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Please read this policy carefully before requesting account
                deletion, as the process is{' '}
                <span className="text-white font-semibold">
                  irreversible after the 30-day grace period
                </span>
                .
              </p>
            </div>
          </section>

          {/* ── 2. How to Request Account Deletion ────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={2}
              title="How to Request Account Deletion"
              Icon={Trash2}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                You can request account deletion through any of the following
                methods:
              </p>

              {/* In-App */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#22C55E]" />
                    Option A: In-App Deletion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 leading-relaxed mb-2">
                    Delete your account directly from the Smart Ride mobile
                    application:
                  </p>
                  <NumberedList
                    items={[
                      'Open the Smart Ride application on your device',
                      'Navigate to Profile',
                      'Tap Settings',
                      'Scroll down and select Delete Account',
                      'Review the warning message and confirm',
                      'Enter the OTP sent to your phone to verify your identity',
                      'Tap Confirm Deletion to submit your request',
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Online */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#22C55E]" />
                    Option B: Online Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 leading-relaxed mb-3">
                    Visit this page at{' '}
                    <a
                      href="https://smartrideug.vercel.app/delete-account"
                      className="text-[#22C55E] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      smartrideug.vercel.app/delete-account
                    </a>{' '}
                    and submit a deletion request, or email our support team
                    directly:
                  </p>
                  <a
                    href="mailto:support@smartride.ug?subject=Account%20Deletion%20Request"
                    className="inline-block"
                  >
                    <Button className="bg-[#005f3a] hover:bg-[#0e7a4d] text-white">
                      <Mail className="w-4 h-4 mr-2" />
                      support@smartride.ug
                    </Button>
                  </a>
                  <p className="text-gray-400 text-sm leading-relaxed mt-4">
                    When emailing, please include the phone number and email
                    address associated with your account. We may request
                    identity verification before processing your request.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── 3. What Happens When You Delete Your Account ───────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={3}
              title="What Happens When You Delete Your Account"
              Icon={UserX}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Once your account deletion request is approved and processed:
              </p>
              <BulletList
                items={[
                  'Your account is deactivated immediately and you cannot log in',
                  'Your personal data is permanently deleted within 30 days',
                  'You lose access to all data associated with your account',
                ]}
              />

              <Card className="bg-red-950/30 border-red-500/30 mt-4">
                <CardHeader>
                  <CardTitle className="text-red-300 text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Data You Lose Access To
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WarningList
                    items={[
                      'Ride and delivery history',
                      'Wallet balance (if not withdrawn — see Section 5)',
                      'Saved addresses and favorite locations',
                      'Saved payment methods (MTN MoMo, Airtel Money, cards)',
                      'Chat history with drivers, merchants, and support',
                      'Ratings and reviews you submitted',
                      'Order receipts and transaction records (personal copy)',
                      'Loyalty rewards and promotional credits',
                    ]}
                  />
                </CardContent>
              </Card>

              <p className="text-gray-300 leading-relaxed mt-4">
                This data cannot be recovered once deletion is complete. Please
                export any data you wish to keep before submitting your
                deletion request.
              </p>
            </div>
          </section>

          {/* ── 4. Data Retained for Legal Obligations ────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={4}
              title="Data Retained for Legal Obligations"
              Icon={Database}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Some information must be retained even after account deletion
                to comply with Ugandan law and protect our platform:
              </p>
              <BulletList
                items={[
                  'Transaction records: retained for 7 years per the Uganda Tax Procedures Code Act (tax compliance)',
                  'Ride and delivery records: retained for 7 years for audit and dispute resolution',
                  'Fraud prevention records: retained for up to 5 years to protect against future fraud',
                  'Records required by court order: retained until the order expires',
                  'KYC and verification documents (driver-partners/merchants): retained per regulatory requirements',
                  'Security incident and investigation records: retained for up to 5 years',
                ]}
              />
              <Card className="bg-[#005f3a]/10 border-[#22C55E]/20 mt-3">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    Retained data is anonymized or pseudonymized wherever
                    possible, and access is restricted to authorized personnel
                    only for legal, audit, and security purposes. It will not
                    be used to recreate your account or for marketing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── 5. Wallet Balance ─────────────────────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={5}
              title="Wallet Balance"
              Icon={Wallet}
            />
            <div className="mt-4 space-y-4">
              <Card className="bg-red-950/30 border-red-500/30">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    <span className="text-red-300 font-semibold">
                      Important:{' '}
                    </span>
                    Any remaining Smart Ride Wallet balance must be withdrawn
                    BEFORE you request account deletion. Unclaimed balances
                    after account deletion are{' '}
                    <span className="text-red-300 font-semibold">
                      permanently forfeited
                    </span>{' '}
                    and cannot be recovered.
                  </p>
                </CardContent>
              </Card>
              <SubHeading label="How to Withdraw Your Balance" Icon={Wallet} />
              <NumberedList
                items={[
                  'Open the Smart Ride app',
                  'Navigate to Wallet',
                  'Tap Withdraw',
                  'Select your preferred payout method (MTN MoMo or Airtel Money)',
                  'Enter the amount and confirm with your PIN',
                  'Wait for the withdrawal to process (usually within 5 minutes)',
                  'Once balance shows 0 UGX, you may proceed with account deletion',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                If you have issues withdrawing your balance, contact{' '}
                <a
                  href="mailto:support@smartride.ug"
                  className="text-[#22C55E] hover:underline"
                >
                  support@smartride.ug
                </a>{' '}
                before submitting your deletion request. Once deletion is
                complete, we cannot process any withdrawals.
              </p>
            </div>
          </section>

          {/* ── 6. Active Rides/Orders ────────────────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={6}
              title="Active Rides & Orders"
              Icon={AlertTriangle}
            />
            <div className="mt-4 space-y-4">
              <Card className="bg-[#005f3a]/10 border-[#22C55E]/20">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    You cannot delete your account while you have active rides,
                    orders, or pending transactions. You must complete or
                    cancel these first.
                  </p>
                </CardContent>
              </Card>
              <p className="text-gray-300 leading-relaxed">
                The system will check for active services when you submit a
                deletion request. If any are found, you will see a message
                listing them and asking you to resolve them first.
              </p>
              <BulletList
                items={[
                  'Active rides: complete the ride or cancel it (subject to cancellation policies)',
                  'Active food/grocery orders: wait for delivery or cancel before processing',
                  'Active parcel deliveries: wait for delivery completion',
                  'Pending wallet withdrawals: wait for the withdrawal to complete',
                  'Open disputes or investigations: wait for resolution',
                  'Pending payouts (driver-partners/merchants): wait for payout to process',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Once all active services are resolved, you may resubmit your
                deletion request.
              </p>
            </div>
          </section>

          {/* ── 7. Recovery ───────────────────────────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={7}
              title="Recovery"
              Icon={RefreshCw}
            />
            <div className="mt-4 space-y-4">
              <Card className="bg-[#005f3a]/10 border-[#22C55E]/20">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    Account deletion is{' '}
                    <span className="text-[#22C55E] font-semibold">
                      reversible during the 30-day grace period
                    </span>{' '}
                    by contacting our support team. After 30 days, the
                    deletion is permanent and the account cannot be recovered.
                  </p>
                </CardContent>
              </Card>
              <SubHeading label="To Cancel a Deletion Request" Icon={Mail} />
              <NumberedList
                items={[
                  'Email support@smartride.ug within 30 days of submitting your deletion request',
                  'Use the subject line: "Cancel Account Deletion Request"',
                  'Include your registered phone number and email address',
                  'Our team will verify your identity and restore your account',
                  'Once restored, you can log back in and continue using Smart Ride',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                After the 30-day grace period expires, all personal data is
                permanently deleted and the recovery process is no longer
                possible. You would need to register a new account to use Smart
                Ride again.
              </p>
            </div>
          </section>

          {/* ── 8. Impact on Connected Accounts ───────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={8}
              title="Impact on Connected Accounts"
              Icon={Link2}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride allows a single phone number to be associated with
                multiple account types (customer, driver-partner, merchant,
                pharmacy partner). When you delete one account, the impact on
                connected accounts depends on the situation:
              </p>
              <BulletList
                items={[
                  'If you delete only your customer account, your driver-partner or merchant accounts remain active',
                  'If you request full deletion (all account types), all connected accounts are deactivated',
                  'Driver-partner KYC documents may be retained for regulatory compliance even after deletion',
                  'Merchant business data is transferred to the business owner if applicable',
                  'Linked payment methods are removed across all connected accounts',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Please specify in your deletion request whether you want to
                delete only one account type or all connected accounts.
              </p>
            </div>
          </section>

          {/* ── 9. Timeline ───────────────────────────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={9}
              title="Timeline"
              Icon={Clock}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                The account deletion process follows this timeline:
              </p>
              <div className="space-y-4 mt-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-base">
                        Step 1: Deactivation{' '}
                        <span className="text-[#22C55E] text-sm font-normal">
                          (Immediate)
                        </span>
                      </p>
                      <p className="text-gray-400 text-sm leading-relaxed mt-1">
                        Account is deactivated within minutes of approval. You
                        can no longer log in or use Smart Ride services.
                        Recovery is still possible.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-base">
                        Step 2: Permanent Deletion{' '}
                        <span className="text-[#22C55E] text-sm font-normal">
                          (30 days)
                        </span>
                      </p>
                      <p className="text-gray-400 text-sm leading-relaxed mt-1">
                        After the 30-day grace period, personal data is
                        permanently deleted from active systems. Recovery is
                        no longer possible.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center">
                      <Database className="w-6 h-6 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-base">
                        Step 3: Data Purge{' '}
                        <span className="text-[#22C55E] text-sm font-normal">
                          (30&ndash;90 days)
                        </span>
                      </p>
                      <p className="text-gray-400 text-sm leading-relaxed mt-1">
                        Residual data is purged from backups and archives.
                        Only legally retained records (see Section 4) remain,
                        in anonymized form where possible.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* ── 10. Contact Us ────────────────────────────────────────────── */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={10}
              title="Contact Us"
              Icon={Mail}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                If you have questions about this Account Deletion Policy, or
                need help with any step of the deletion process, our support
                team is available 24/7:
              </p>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="space-y-3">
                  <p className="text-white font-semibold text-lg">
                    Smart Ride Support
                  </p>
                  <p className="text-gray-400 text-sm">
                    Natural Intellects Corp
                  </p>
                  <div className="flex items-center gap-3 text-gray-300 pt-2">
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
                      href="https://smartrideug.vercel.app/delete-account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#22C55E] transition-colors"
                    >
                      smartrideug.vercel.app/delete-account
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="w-5 h-5 text-[#22C55E] shrink-0" />
                    <span>Kampala, Uganda</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#005f3a]/10 border-[#22C55E]/20">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed text-sm">
                    <span className="text-[#22C55E] font-semibold">
                      Tip:{' '}
                    </span>
                    For faster processing of your deletion request, please
                    include your registered phone number, email address, and a
                    clear statement that you want to delete your account.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {/* ═══════ STICKY FOOTER ═══════ */}
      <footer className="mt-auto bg-[#0a0f1a] border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Logo variant="dark" />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
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
              <Link
                href="/delete-account"
                className="text-gray-400 hover:text-[#22C55E] transition-colors"
              >
                Account Deletion
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
            <Mail className="w-4 h-4 text-[#22C55E]" />
            <a
              href="mailto:support@smartride.ug"
              className="hover:text-[#22C55E] transition-colors"
            >
              support@smartride.ug
            </a>
          </div>
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm">
              &copy; 2025 Smart Ride. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
