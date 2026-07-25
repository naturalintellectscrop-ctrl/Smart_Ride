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
  FileText,
  ArrowLeft,
  Calendar,
  Mail,
  Globe,
  MapPin,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Car,
  Package,
  CreditCard,
  Ban,
  Shield,
  AlertTriangle,
  Scale,
  Gavel,
  RefreshCw,
  Building2,
  Wallet,
  UserX,
  Copyright,
  Trash2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Smart Ride',
  description:
    'Smart Ride Terms of Service: the rules and conditions that govern your use of our rides, delivery, shopping, pharmacy, and wallet services.',
  alternates: {
    canonical: 'https://smartrideug.vercel.app/terms',
  },
  openGraph: {
    title: 'Terms of Service | Smart Ride',
    description:
      'The rules and conditions that govern your use of Smart Ride in Uganda.',
    url: 'https://smartrideug.vercel.app/terms',
  },
};

// Helpers
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 ml-1 mt-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-gray-300 text-[15px] leading-relaxed"
        >
          <CheckCircle2 className="shrink-0 w-5 h-5 text-[#00FF88] mt-0.5" />
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
      className="border-l-4 border-[#00FF88] pl-4 flex items-center gap-3 text-2xl sm:text-3xl font-bold text-white scroll-mt-24"
    >
      <Icon className="w-6 h-6 text-[#00FF88] shrink-0" />
      <span>
        <span className="text-[#00FF88] mr-2">{number}.</span>
        {title}
      </span>
    </h2>
  );
}

function SubHeading({ label }: { label: string }) {
  return (
    <h3 className="text-base sm:text-lg font-semibold text-[#00FF88] mt-6 mb-1 flex items-center gap-2">
      <ChevronRight className="w-4 h-4" />
      {label}
    </h3>
  );
}

// Page
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col">
      {/* Sticky header */}
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

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Badge
              variant="outline"
              className="bg-[#00FF88]/10 border-[#00FF88]/30 text-[#00FF88] px-4 py-1.5 text-sm gap-2"
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Smart Ride Terms of Service
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00FF88]" />
              Effective Date:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
            <span className="hidden sm:inline w-px h-4 bg-white/20" />
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#00FF88]" />
              Last Updated:{' '}
              <span className="text-white font-medium">June 18, 2026</span>
            </span>
          </div>

          <Card className="bg-[#005f3a]/15 border-[#00FF88]/20 text-left">
            <CardContent className="space-y-4">
              <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base">
                Welcome to Smart Ride, a Ugandan ride-hailing and services
                super-app operated by{' '}
                <span className="text-white font-semibold">
                  Natural Intellects Corp
                </span>
                .
              </p>
              <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base">
                These Terms of Service govern your use of the Smart Ride mobile
                application, website ({' '}
                <a
                  href="https://smartrideug.vercel.app"
                  className="text-[#00FF88] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  smartrideug.vercel.app
                </a>{' '}
                ), and related services.
              </p>
              <p className="text-gray-300 leading-relaxed text-[15px] sm:text-base">
                By creating an account or using Smart Ride, you agree to be
                bound by these Terms. If you do not agree, please do not use
                our services.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main content */}
      <main className="flex-1 px-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* 1. Acceptance of Terms */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={1}
              title="Acceptance of Terms"
              Icon={FileText}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                By downloading, installing, accessing, or using the Smart Ride
                application or website, you acknowledge that you have read,
                understood, and agree to be bound by these Terms of Service and
                our{' '}
                <Link
                  href="/privacy"
                  className="text-[#00FF88] hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <p className="text-gray-300 leading-relaxed">
                If you are using Smart Ride on behalf of a business, you
                represent that you have the authority to bind that business to
                these Terms.
              </p>
              <p className="text-gray-300 leading-relaxed">
                These Terms constitute a legally binding agreement between you
                and Natural Intellects Corp. If you do not agree to any part of
                these Terms, you must not access or use Smart Ride.
              </p>
            </div>
          </section>

          {/* 2. Description of Service */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={2}
              title="Description of Service"
              Icon={Car}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride is a technology platform that connects customers
                with independent service providers across Uganda. Our services
                include:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Car className="w-5 h-5 text-[#00FF88]" />
                    <CardTitle className="text-white text-base">
                      Ride-Hailing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Smart Boda (motorcycle) and Smart Car rides across
                      Kampala and beyond.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Package className="w-5 h-5 text-[#00FF88]" />
                    <CardTitle className="text-white text-base">
                      Delivery Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Food delivery, parcel delivery, and item delivery
                      services.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Package className="w-5 h-5 text-[#00FF88]" />
                    <CardTitle className="text-white text-base">
                      Shopping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Grocery and retail shopping with delivery from local
                      merchants.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Shield className="w-5 h-5 text-[#00FF88]" />
                    <CardTitle className="text-white text-base">
                      Health & Pharmacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Pharmacy item delivery and connection to licensed health
                      providers.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <Wallet className="w-5 h-5 text-[#00FF88]" />
                    <CardTitle className="text-white text-base">
                      Smart Wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Digital wallet for top-ups, transfers, and payments
                      within the platform.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <AlertTriangle className="w-5 h-5 text-[#00FF88]" />
                    <CardTitle className="text-white text-base">
                      Safety Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      SOS alerts, live location sharing, masked calling, and
                      trip monitoring.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-gray-300 leading-relaxed mt-4">
                Smart Ride acts as a technology intermediary. We do not provide
                transportation or delivery services ourselves; these are
                provided by independent driver-partners and merchants who use
                our platform.
              </p>
            </div>
          </section>

          {/* 3. User Accounts */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={3}
              title="User Accounts"
              Icon={UserCheck}
            />
            <div className="mt-4 space-y-2">
              <SubHeading label="Registration" />
              <p className="text-gray-300 leading-relaxed">
                To use Smart Ride, you must register an account with a valid
                phone number, email address, and full name. You may also
                register using Google or Apple Sign-In.
              </p>

              <SubHeading label="Accuracy of Information" />
              <p className="text-gray-300 leading-relaxed">
                You agree to provide accurate, current, and complete
                information during registration and to keep your account
                information updated.
              </p>

              <SubHeading label="Account Security" />
              <p className="text-gray-300 leading-relaxed">
                You are responsible for:
              </p>
              <BulletList
                items={[
                  'Maintaining the confidentiality of your password and OTP codes',
                  'All activities that occur under your account',
                  ' promptly notifying Smart Ride of any unauthorized access',
                  'Logging out of shared devices',
                ]}
              />

              <SubHeading label="Eligibility" />
              <Card className="bg-[#005f3a]/10 border-[#00FF88]/20 mt-3">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    You must be at least{' '}
                    <span className="text-[#00FF88] font-semibold">
                      18 years old
                    </span>{' '}
                    to register an account and use Smart Ride services.
                    Driver-partners and merchants must additionally meet
                    licensing and regulatory requirements under Ugandan law.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 4. User Conduct */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={4}
              title="User Conduct"
              Icon={Ban}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                You agree to use Smart Ride only for lawful purposes. The
                following activities are strictly prohibited:
              </p>
              <BulletList
                items={[
                  'Using Smart Ride for any illegal activity under Ugandan law',
                  'Harassing, abusing, or threatening drivers, merchants, or other users',
                  'Discriminating against any user based on race, ethnicity, gender, religion, or disability',
                  'Carrying illegal, dangerous, or prohibited items (weapons, drugs, explosives)',
                  'Requesting off-platform services to bypass Smart Ride fees',
                  'Creating fake or duplicate accounts',
                  'Selling, renting, or transferring your account',
                  'Tampering with the app, reverse engineering, or using bots',
                  'Interfering with the proper functioning of GPS, payments, or ratings',
                  'Using Smart Ride to transport illicit goods or persons',
                  'Smoking, consuming alcohol, or using drugs in a Smart Ride vehicle',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Violations may result in account suspension, permanent
                termination, and reporting to Ugandan law enforcement
                authorities.
              </p>
            </div>
          </section>

          {/* 5. Payments & Wallet */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={5}
              title="Payments & Wallet"
              Icon={CreditCard}
            />
            <div className="mt-4 space-y-2">
              <p className="text-gray-300 leading-relaxed">
                Smart Ride supports the following payment methods in Uganda:
              </p>
              <BulletList
                items={[
                  'MTN MoMo (Mobile Money)',
                  'Airtel Money',
                  'Nylon Pay (digital wallet)',
                  'Visa / Mastercard (via Flutterwave)',
                  'Cash (for select rides and orders)',
                  'Smart Ride Wallet balance',
                ]}
              />

              <SubHeading label="Wallet Terms" />
              <p className="text-gray-300 leading-relaxed">
                The Smart Ride Wallet allows you to top up, store, transfer,
                and spend money within the platform:
              </p>
              <BulletList
                items={[
                  'Wallet balances are held in Ugandan Shillings (UGX)',
                  'Top-ups are processed through MTN MoMo, Airtel Money, Nylon Pay, or cards',
                  'Wallet funds are not bank deposits and do not earn interest',
                  'Wallet balances are non-transferable to third parties outside Smart Ride',
                  'You must withdraw any balance before deleting your account. Unclaimed balances are forfeited',
                ]}
              />

              <SubHeading label="Refunds" />
              <Card className="bg-[#005f3a]/10 border-[#00FF88]/20 mt-3">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    All payments are final. Refunds are issued only where
                    required by Ugandan law, or in cases of confirmed service
                    failure (e.g., order not delivered, driver cancellation
                    after pickup). Refund requests must be submitted within{' '}
                    <span className="text-[#00FF88] font-semibold">48 hours</span>{' '}
                    of the incident.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 6. Ride & Service Terms */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={6}
              title="Ride & Service Terms"
              Icon={Car}
            />
            <div className="mt-4 space-y-2">
              <SubHeading label="Driver-Partner Relationship" />
              <p className="text-gray-300 leading-relaxed">
                Smart Ride connects you with independent driver-partners and
                merchants. These service providers are not employees of Smart
                Ride or Natural Intellects Corp. Smart Ride is not liable for
                the acts or omissions of driver-partners or merchants.
              </p>

              <SubHeading label="Ratings & Reviews" />
              <p className="text-gray-300 leading-relaxed">
                After each ride or order, you may rate the driver or merchant.
                Ratings help maintain service quality. Consistently low-rated
                users may be restricted from using Smart Ride.
              </p>

              <SubHeading label="Cancellations" />
              <BulletList
                items={[
                  'You may cancel a ride or order free of charge before a driver-partner accepts',
                  'Cancellations after acceptance may incur a fee',
                  'Repeated cancellations may result in account restrictions',
                  'Driver-partners may also cancel rides with valid reasons (e.g., safety concerns)',
                ]}
              />

              <SubHeading label="Fares & Surge Pricing" />
              <p className="text-gray-300 leading-relaxed">
                Fares are calculated based on distance, time, and service type.
                During periods of high demand, surge pricing may apply. The
                estimated fare is shown before you confirm your booking.
              </p>
            </div>
          </section>

          {/* 7. Driver/Merchant Terms */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={7}
              title="Driver & Merchant Terms"
              Icon={Building2}
            />
            <div className="mt-4 space-y-2">
              <SubHeading label="Partnerships" />
              <p className="text-gray-300 leading-relaxed">
                Driver-partners and merchants operate as independent
                businesses. They must:
              </p>
              <BulletList
                items={[
                  'Hold valid Ugandan driving licenses, vehicle permits, and PSV badges (drivers)',
                  'Hold valid business registration and trading licenses (merchants)',
                  'Comply with all Ugandan laws, including traffic and tax laws',
                  'Maintain vehicle roadworthiness and insurance (drivers)',
                  'Provide accurate menu, pricing, and inventory information (merchants)',
                  'Maintain hygiene and food safety standards (food merchants)',
                ]}
              />

              <SubHeading label="Payouts" />
              <p className="text-gray-300 leading-relaxed">
                Driver-partner and merchant earnings are calculated based on
                completed rides/orders minus Smart Ride commission. Payouts are
                made to your registered mobile money or bank account according
                to the agreed payout schedule. You are responsible for all
                taxes on your earnings.
              </p>

              <SubHeading label="Termination of Partnership" />
              <p className="text-gray-300 leading-relaxed">
                Smart Ride may suspend or terminate driver-partner or merchant
                accounts for violations of these Terms, low performance
                ratings, fraud, or regulatory non-compliance.
              </p>
            </div>
          </section>

          {/* 8. Intellectual Property */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={8}
              title="Intellectual Property"
              Icon={Copyright}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                The Smart Ride platform, including its name, logo, software,
                design, content, and trademarks, is owned by Natural
                Intellects Corp and protected by Ugandan and international
                intellectual property laws.
              </p>
              <p className="text-gray-300 leading-relaxed">
                You may not:
              </p>
              <BulletList
                items={[
                  'Copy, modify, or distribute Smart Ride content without permission',
                  'Use the Smart Ride name or logo without authorization',
                  'Reverse engineer or decompile the application',
                  'Remove copyright or trademark notices',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                User-generated content (reviews, ratings, photos) remains the
                property of the user, but you grant Smart Ride a non-exclusive,
                royalty-free license to use, display, and distribute that
                content within the platform.
              </p>
            </div>
          </section>

          {/* 9. Disclaimers & Limitation of Liability */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={9}
              title="Disclaimers & Limitation of Liability"
              Icon={AlertTriangle}
            />
            <div className="mt-4 space-y-4">
              <SubHeading label="Disclaimers" />
              <p className="text-gray-300 leading-relaxed">
                Smart Ride is provided on an &ldquo;as is&rdquo; and{' '}
                &ldquo;as available&rdquo; basis. We do not warrant that:
              </p>
              <BulletList
                items={[
                  'Services will be uninterrupted, error-free, or available at all times',
                  'Drivers or merchants will perform services to a specific standard',
                  'Pricing, ETA, or location information will always be accurate',
                  'The platform is free of viruses or other harmful components',
                ]}
              />

              <SubHeading label="Limitation of Liability" />
              <Card className="bg-[#005f3a]/10 border-[#00FF88]/20 mt-3">
                <CardContent>
                  <p className="text-gray-200 leading-relaxed">
                    To the maximum extent permitted by Ugandan law, Natural
                    Intellects Corp shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages,
                    including loss of profits, data, or goodwill, arising out
                    of or related to your use of Smart Ride. Our total
                    liability shall not exceed the total amount you paid to
                    Smart Ride in the 12 months preceding the claim.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 10. Termination */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={10}
              title="Termination"
              Icon={UserX}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                You may delete your account at any time through the app or by
                visiting our{' '}
                <Link
                  href="/delete-account"
                  className="text-[#00FF88] hover:underline"
                >
                  Account Deletion Policy
                </Link>{' '}
                page.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Smart Ride may suspend or terminate your account if:
              </p>
              <BulletList
                items={[
                  'You violate these Terms of Service',
                  'You engage in fraudulent, abusive, or unlawful activity',
                  'You fail to pay for services rendered',
                  'Your account is inactive for more than 24 months',
                  'Required by law or regulatory authority',
                ]}
              />
              <p className="text-gray-300 leading-relaxed">
                Upon termination, your right to use Smart Ride ceases
                immediately. Provisions that should reasonably survive
                termination (including payment obligations, intellectual
                property, and liability limitations) will continue in effect.
              </p>
            </div>
          </section>

          {/* 11. Governing Law */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={11}
              title="Governing Law"
              Icon={Scale}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                These Terms of Service are governed by and construed in
                accordance with the laws of the{' '}
                <span className="text-white font-semibold">
                  Republic of Uganda
                </span>
                , without regard to its conflict of law provisions.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Any dispute arising out of or relating to these Terms shall be
                subject to the exclusive jurisdiction of the courts of Uganda,
                with the primary venue being Kampala.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Where required by Ugandan law, parties may first attempt to
                resolve disputes through mediation or arbitration administered
                by the Uganda Centre for Arbitration and Dispute Resolution
                (CADER).
              </p>
            </div>
          </section>

          {/* 12. Changes to Terms */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={12}
              title="Changes to Terms"
              Icon={RefreshCw}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We may update these Terms of Service from time to time. When we
                do, we will revise the &ldquo;Last Updated&rdquo; date at the
                top of this page.
              </p>
              <p className="text-gray-300 leading-relaxed">
                For material changes, we will notify you through the app or via
                email before the changes take effect. Continued use of Smart
                Ride after the effective date constitutes acceptance of the
                updated Terms.
              </p>
              <p className="text-gray-300 leading-relaxed">
                If you do not agree to the updated Terms, you must stop using
                Smart Ride and may delete your account.
              </p>
            </div>
          </section>

          {/* 13. Contact Us */}
          <section className="scroll-mt-24">
            <SectionHeading
              number={13}
              title="Contact Us"
              Icon={Mail}
            />
            <div className="mt-4 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                If you have questions, concerns, or requests regarding these
                Terms of Service, please contact us:
              </p>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="space-y-3">
                  <p className="text-white font-semibold text-lg">
                    Natural Intellects Corp
                  </p>
                  <p className="text-gray-400 text-sm">
                    Operator of Smart Ride Uganda
                  </p>
                  <div className="flex items-center gap-3 text-gray-300 pt-2">
                    <Mail className="w-5 h-5 text-[#00FF88] shrink-0" />
                    <a
                      href="mailto:support@smartride.ug"
                      className="hover:text-[#00FF88] transition-colors"
                    >
                      support@smartride.ug
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Globe className="w-5 h-5 text-[#00FF88] shrink-0" />
                    <a
                      href="https://smartrideug.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#00FF88] transition-colors"
                    >
                      smartrideug.vercel.app
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="w-5 h-5 text-[#00FF88] shrink-0" />
                    <span>Kampala, Uganda</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto bg-[#0a0f1a] border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Logo variant="dark" />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-[#00FF88] transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-[#00FF88] transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/delete-account"
                className="text-gray-400 hover:text-[#00FF88] transition-colors"
              >
                Account Deletion
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
            <Mail className="w-4 h-4 text-[#00FF88]" />
            <a
              href="mailto:support@smartride.ug"
              className="hover:text-[#00FF88] transition-colors"
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
