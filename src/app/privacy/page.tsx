import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Reveal } from '@/components/marketing/Reveal';
import { PageToc } from '@/components/marketing/PageToc';
import {
  Shield,
  Calendar,
  Mail,
  Globe,
  UserCircle,
  MapPin,
  CreditCard,
  Smartphone,
  BarChart3,
  Share2,
  Lock,
  Database,
  Eye,
  Cookie,
  Baby,
  RefreshCw,
  Building2,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Smart Ride',
  description:
    'Smart Ride Privacy Policy: how we collect, use, share, store, and protect your personal information.',
  alternates: {
    canonical: 'https://smartrideug.vercel.app/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | Smart Ride',
    description:
      'How Smart Ride collects, uses, shares, and protects your personal information.',
    url: 'https://smartrideug.vercel.app/privacy',
  },
};

// Helpers
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 ml-1 mt-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-mkt-fg-muted text-[15px] leading-relaxed"
        >
          <CheckCircle2 className="shrink-0 w-5 h-5 text-mkt-accent mt-0.5" />
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
      className="border-l-4 border-mkt-accent pl-4 flex items-center gap-3 text-2xl sm:text-3xl font-bold text-mkt-fg scroll-mt-24"
    >
      <Icon className="w-6 h-6 text-mkt-accent shrink-0" />
      <span>
        <span className="text-mkt-accent mr-2">{number}.</span>
        {title}
      </span>
    </h2>
  );
}

function SubHeading({ label }: { label: string }) {
  return (
    <h3 className="text-base sm:text-lg font-semibold text-mkt-accent mt-6 mb-1 flex items-center gap-2">
      <ChevronRight className="w-4 h-4" />
      {label}
    </h3>
  );
}

const tocSections = [
  { id: 'section-1', label: 'Introduction' },
  { id: 'section-2', label: 'Information We Collect' },
  { id: 'section-3', label: 'How We Use Your Information' },
  { id: 'section-4', label: 'Information Sharing' },
  { id: 'section-5', label: 'Data Security' },
  { id: 'section-6', label: 'Data Retention' },
  { id: 'section-7', label: 'Your Rights' },
  { id: 'section-8', label: 'Cookies & Tracking' },
  { id: 'section-9', label: "Children's Privacy" },
  { id: 'section-10', label: 'Changes to This Policy' },
  { id: 'section-11', label: 'Contact Us' },
];

// Page
export default function PrivacyPage() {
  return (
    <MarketingShell>
      <MarketingHeader />

      {/* Hero */}
      <section className="py-16 px-4">
        <Reveal className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Badge
              variant="outline"
              className="bg-mkt-accent/10 border-mkt-accent/30 text-mkt-accent px-4 py-1.5 text-sm gap-2"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Smart Ride Privacy Policy
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-sm text-mkt-fg-muted">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-mkt-accent" />
              Effective Date:{' '}
              <span className="text-mkt-fg font-medium">June 18, 2026</span>
            </span>
            <span className="hidden sm:inline w-px h-4 bg-mkt-fg-faint/20" />
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-mkt-accent" />
              Last Updated:{' '}
              <span className="text-mkt-fg font-medium">June 18, 2026</span>
            </span>
          </div>

          <Card className="bg-mkt-accent/10 border-mkt-accent/20 text-left">
            <CardContent className="space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed text-[15px] sm:text-base">
                Smart Ride (&ldquo;Smart Ride&rdquo;, &ldquo;we&rdquo;,
                &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is operated by{' '}
                <span className="text-mkt-fg font-semibold">
                  Natural Intellects Corp
                </span>
                , a company registered in the Republic of Uganda. We are
                committed to protecting your privacy and safeguarding your
                personal information.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed text-[15px] sm:text-base">
                This Privacy Policy explains how we collect, use, store, share,
                and protect information when you use the Smart Ride mobile
                application, website ({' '}
                <a
                  href="https://smartrideug.vercel.app"
                  className="text-mkt-accent hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  smartrideug.vercel.app
                </a>{' '}
                ), and related services.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed text-[15px] sm:text-base">
                By using Smart Ride, you agree to the practices described in
                this Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      {/* Main content */}
      <main className="flex-1 px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <PageToc sections={tocSections} />
          </Reveal>

          <div className="space-y-12">
          {/* 1. Introduction */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={1}
                title="Introduction"
                Icon={Building2}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                This Privacy Policy applies to all users of Smart Ride,
                including customers (riders), driver-partners, merchants,
                pharmacy partners, and any other individuals who interact with
                our platform.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed">
                Smart Ride is a Ugandan ride-hailing and services super-app
                that connects customers with transportation and on-demand
                services including food delivery, shopping, parcel delivery,
                health & pharmacy, and wallet services.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed">
                We are committed to handling your personal information in
                accordance with the Uganda Data Protection and Privacy Act,
                2019, and applicable international privacy standards.
              </p>
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={2}
                title="Information We Collect"
                Icon={Eye}
              />
            </Reveal>
            <div className="mt-4 space-y-2">
              <p className="text-mkt-fg-muted leading-relaxed">
                We collect information that you provide directly to us and
                information collected automatically when you use Smart Ride.
              </p>

              <SubHeading label="A. Account Information" />
              <p className="text-mkt-fg-muted leading-relaxed">
                When you create an account, we collect:
              </p>
              <BulletList
                items={[
                  'Full name',
                  'Email address',
                  'Phone number',
                  'Profile photograph (optional)',
                  'Account credentials (securely hashed)',
                  'Emergency contact information (if provided)',
                ]}
              />

              <SubHeading label="B. Location Data" />
              <p className="text-mkt-fg-muted leading-relaxed">
                To provide ride-hailing and delivery services, we collect:
              </p>
              <BulletList
                items={[
                  'Precise GPS location (during active rides/orders)',
                  'Pickup and drop-off locations',
                  'Saved addresses',
                  'Real-time route information',
                  'Approximate location when the app is in the foreground',
                ]}
              />

              <SubHeading label="C. Payment Information" />
              <p className="text-mkt-fg-muted leading-relaxed">
                To process payments, we collect:
              </p>
              <BulletList
                items={[
                  'Mobile money account details (MTN MoMo, Airtel Money)',
                  'Nylon Pay wallet identifiers',
                  'Card information (processed by our payment partners; we do not store full card numbers)',
                  'Wallet top-up and withdrawal history',
                  'Transaction records and receipts',
                ]}
              />

              <SubHeading label="D. Device Information" />
              <p className="text-mkt-fg-muted leading-relaxed">
                We automatically collect:
              </p>
              <BulletList
                items={[
                  'Device model and operating system',
                  'App version',
                  'Device identifiers',
                  'IP address',
                  'Network information (Wi-Fi, mobile data)',
                  'Crash reports and diagnostic logs',
                ]}
              />

              <SubHeading label="E. Usage Data" />
              <p className="text-mkt-fg-muted leading-relaxed">
                We collect information about how you use Smart Ride:
              </p>
              <BulletList
                items={[
                  'Ride and order history',
                  'Search queries and viewed items',
                  'App interactions and taps',
                  'Ratings and reviews submitted',
                  'In-app chat messages with drivers, merchants, and support',
                  'Customer support communications',
                ]}
              />
            </div>
          </section>

          {/* 3. How We Use Your Information */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={3}
                title="How We Use Your Information"
                Icon={BarChart3}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                We use the information we collect to:
              </p>
              <BulletList
                items={[
                  'Provide ride-hailing, delivery, shopping, pharmacy, and wallet services',
                  'Match customers with nearby drivers and service providers',
                  'Calculate routes, fares, and delivery fees',
                  'Process payments and issue receipts through MTN MoMo, Airtel Money, Nylon Pay, and cards',
                  'Verify identities and prevent fraud, abuse, and unauthorized access',
                  'Ensure safety through features like SOS, live location sharing, and trip monitoring',
                  'Provide customer support and resolve disputes',
                  'Send service-related notifications (ride updates, order status, OTPs)',
                  'Send marketing and promotional communications (with your consent)',
                  'Improve our services, develop new features, and conduct analytics',
                  'Comply with legal, tax, and regulatory obligations in Uganda',
                ]}
              />
            </div>
          </section>

          {/* 4. Information Sharing */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={4}
                title="Information Sharing"
                Icon={Share2}
              />
            </Reveal>
            <div className="mt-4 space-y-2">
              <p className="text-mkt-fg-muted leading-relaxed">
                We do not sell your personal information. We share information
                only in the following circumstances:
              </p>

              <SubHeading label="A. Service Providers" />
              <p className="text-mkt-fg-muted leading-relaxed">
                We share information with trusted third-party service providers
                that help operate Smart Ride:
              </p>
              <BulletList
                items={[
                  'Payment processors: Nylon Pay, MTN MoMo, Airtel Money, Flutterwave (cards)',
                  'Cloud hosting and infrastructure providers',
                  'Mapping and navigation providers (Mapbox)',
                  'Authentication providers (Google, Apple Sign-In)',
                  'Push notification and messaging providers (Firebase)',
                  'Analytics providers',
                ]}
              />

              <SubHeading label="B. With Drivers, Merchants & Service Partners" />
              <p className="text-mkt-fg-muted leading-relaxed">
                To complete services, we share the minimum information
                necessary:
              </p>
              <BulletList
                items={[
                  'Your name and contact details with the assigned driver or merchant',
                  'Pickup and drop-off locations',
                  'Order details and special instructions',
                  'Payment confirmation (not full payment details)',
                ]}
              />

              <SubHeading label="C. Legal Compliance" />
              <p className="text-mkt-fg-muted leading-relaxed">
                We may disclose information when required by:
              </p>
              <BulletList
                items={[
                  'Law, regulation, or court order',
                  'Requests from Ugandan law enforcement or government authorities',
                  'Subpoenas, search warrants, or other legal process',
                  'Tax authority requirements (Uganda Revenue Authority)',
                ]}
              />

              <SubHeading label="D. Safety & Protection" />
              <p className="text-mkt-fg-muted leading-relaxed">
                We may share information to:
              </p>
              <BulletList
                items={[
                  'Protect the safety, rights, or property of Smart Ride users',
                  'Investigate fraud, abuse, or violations of our Terms',
                  'Respond to emergencies or SOS alerts',
                  'Prevent harm to the public',
                ]}
              />

              <SubHeading label="E. Business Transfers" />
              <p className="text-mkt-fg-muted leading-relaxed">
                In the event of a merger, acquisition, or asset sale, user
                information may be transferred as a business asset. We will
                notify you before your information is transferred and becomes
                subject to a different privacy policy.
              </p>
            </div>
          </section>

          {/* 5. Data Security */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={5}
                title="Data Security"
                Icon={Lock}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                We implement industry-standard security measures to protect
                your personal information:
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                <Card className="bg-mkt-bg-raised border-mkt-border text-mkt-fg">
                  <CardHeader>
                    <Lock className="w-5 h-5 text-mkt-accent" />
                    <CardTitle className="text-mkt-fg text-base">
                      Encryption
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-mkt-fg-muted text-sm leading-relaxed">
                      All data in transit is secured with TLS 1.2+ encryption.
                      Sensitive data at rest is encrypted with AES-256.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-mkt-bg-raised border-mkt-border text-mkt-fg">
                  <CardHeader>
                    <Database className="w-5 h-5 text-mkt-accent" />
                    <CardTitle className="text-mkt-fg text-base">
                      Secure Storage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-mkt-fg-muted text-sm leading-relaxed">
                      Data is stored in secure, access-controlled databases
                      with regular backups and disaster recovery procedures.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-mkt-bg-raised border-mkt-border text-mkt-fg">
                  <CardHeader>
                    <Shield className="w-5 h-5 text-mkt-accent" />
                    <CardTitle className="text-mkt-fg text-base">
                      Access Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-mkt-fg-muted text-sm leading-relaxed">
                      Strict role-based access controls limit data access to
                      authorized personnel only. All access is logged and
                      audited.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-mkt-fg-muted leading-relaxed mt-4">
                Despite our safeguards, no system is 100% secure. If a data
                breach occurs, we will notify affected users and the relevant
                authorities in accordance with Ugandan law.
              </p>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={6}
                title="Data Retention"
                Icon={Database}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                We retain your personal information for as long as your account
                is active, and thereafter as needed to comply with legal
                obligations, resolve disputes, and enforce our agreements.
              </p>
              <BulletList
                items={[
                  'Account data: retained while your account is active',
                  'Transaction records: retained for 7 years per Uganda tax law',
                  'Ride and delivery history: retained for 7 years for tax and audit purposes',
                  'Customer support records: retained for 3 years',
                  'Device and usage logs: retained for up to 24 months',
                  'Marketing consent records: retained until you withdraw consent',
                ]}
              />
              <p className="text-mkt-fg-muted leading-relaxed">
                When data is no longer needed, we delete it or anonymize it so
                it can no longer be associated with you. See our{' '}
                <Link
                  href="/delete-account"
                  className="text-mkt-accent hover:underline"
                >
                  Account Deletion Policy
                </Link>{' '}
                for details.
              </p>
            </div>
          </section>

          {/* 7. Your Rights */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={7}
                title="Your Rights"
                Icon={UserCircle}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                Under the Uganda Data Protection and Privacy Act, 2019, you
                have the following rights regarding your personal information:
              </p>
              <BulletList
                items={[
                  'Access: Request a copy of the personal information we hold about you',
                  'Correction: Request correction of inaccurate or incomplete information',
                  'Deletion: Request deletion of your account and personal data (subject to legal retention requirements)',
                  'Data Export: Receive an export of your personal data in a portable format',
                  'Withdraw Consent: Withdraw consent for marketing communications at any time',
                  'Object: Object to processing of your data for specific purposes',
                  'Complain: Lodge a complaint with the Uganda Personal Data Protection Office',
                ]}
              />
              <p className="text-mkt-fg-muted leading-relaxed">
                To exercise any of these rights, contact us at{' '}
                <a
                  href="mailto:support@smartride.ug"
                  className="text-mkt-accent hover:underline"
                >
                  support@smartride.ug
                </a>
                . We will respond within 30 days.
              </p>
            </div>
          </section>

          {/* 8. Cookies & Tracking */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={8}
                title="Cookies & Tracking"
                Icon={Cookie}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                Smart Ride uses cookies and similar tracking technologies on
                our website to:
              </p>
              <BulletList
                items={[
                  'Keep you logged in during your session',
                  'Remember your preferences (language, theme)',
                  'Analyze website traffic and usage patterns',
                  'Improve website performance and features',
                  'Serve relevant marketing content (with your consent)',
                ]}
              />
              <p className="text-mkt-fg-muted leading-relaxed">
                You can control cookies through your browser settings. Disabling
                cookies may affect some website functionality. The mobile app
                uses anonymous device identifiers for analytics and fraud
                prevention, which you can manage in your device settings.
              </p>
            </div>
          </section>

          {/* 9. Children's Privacy */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={9}
                title="Children's Privacy"
                Icon={Baby}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <Card className="bg-mkt-accent/10 border-mkt-accent/20">
                <CardContent>
                  <p className="text-mkt-fg-muted leading-relaxed">
                    Smart Ride is not intended for children under{' '}
                    <span className="text-mkt-accent font-semibold">13 years</span>{' '}
                    of age. We do not knowingly collect personal information
                    from children under 13.
                  </p>
                </CardContent>
              </Card>
              <p className="text-mkt-fg-muted leading-relaxed">
                Users between 13 and 18 may use Smart Ride only with the
                involvement of a parent or legal guardian. Driver-partners and
                merchants must be at least 18 years old.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed">
                If you believe we have collected information from a child under
                13, please contact us at{' '}
                <a
                  href="mailto:support@smartride.ug"
                  className="text-mkt-accent hover:underline"
                >
                  support@smartride.ug
                </a>{' '}
                and we will promptly delete it.
              </p>
            </div>
          </section>

          {/* 10. Changes to This Policy */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={10}
                title="Changes to This Policy"
                Icon={RefreshCw}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, technologies, legal requirements, or
                other factors.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed">
                We will notify you of material changes by posting the updated
                policy on this page and updating the &ldquo;Last Updated&rdquo;
                date. For significant changes, we may also send a notification
                through the app or via email.
              </p>
              <p className="text-mkt-fg-muted leading-relaxed">
                Continued use of Smart Ride after the effective date of any
                changes constitutes your acceptance of the updated Privacy
                Policy.
              </p>
            </div>
          </section>

          {/* 11. Contact Us */}
          <section className="scroll-mt-24">
            <Reveal amount={0.15}>
              <SectionHeading
                number={11}
                title="Contact Us"
                Icon={Mail}
              />
            </Reveal>
            <div className="mt-4 space-y-4">
              <p className="text-mkt-fg-muted leading-relaxed">
                If you have questions, concerns, or requests regarding this
                Privacy Policy or your personal information, please contact
                our Data Protection Officer:
              </p>
              <Card className="bg-mkt-bg-raised border-mkt-border text-mkt-fg">
                <CardContent className="space-y-3">
                  <p className="text-mkt-fg font-semibold text-lg">
                    Natural Intellects Corp
                  </p>
                  <p className="text-mkt-fg-muted text-sm">
                    Operator of Smart Ride Uganda
                  </p>
                  <div className="flex items-center gap-3 text-mkt-fg-muted pt-2">
                    <Mail className="w-5 h-5 text-mkt-accent shrink-0" />
                    <a
                      href="mailto:support@smartride.ug"
                      className="hover:text-mkt-accent transition-colors"
                    >
                      support@smartride.ug
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-mkt-fg-muted">
                    <Globe className="w-5 h-5 text-mkt-accent shrink-0" />
                    <a
                      href="https://smartrideug.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-mkt-accent transition-colors"
                    >
                      smartrideug.vercel.app
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-mkt-fg-muted">
                    <MapPin className="w-5 h-5 text-mkt-accent shrink-0" />
                    <span>Kampala, Uganda</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </MarketingShell>
  );
}
