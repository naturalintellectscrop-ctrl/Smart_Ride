'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  ShieldCheck,
  UserCircle,
  MapPin,
  CreditCard,
  Smartphone,
  BarChart3,
  MessageSquare,
  Eye,
  Scale,
  Share2,
  Clock,
  Lock,
  Baby,
  Cookie,
  Bell,
  Phone,
  Mail,
  ArrowLeft,
  ChevronRight,
  Building2,
  FileText,
} from 'lucide-react';

const tocSections = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'data-we-collect', label: 'Data We Collect' },
  { id: 'how-we-use-data', label: 'How We Use Data' },
  { id: 'legal-basis', label: 'Legal Basis' },
  { id: 'data-sharing', label: 'Data Sharing' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: 'Children' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPage() {
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
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)' }} />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#00FF88] rounded-full blur-[128px] opacity-15" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#00FFF3] rounded-full blur-[128px] opacity-15" />
        <div className="relative z-10 text-center px-4">
          <div className="inline-flex items-center gap-2 bg-[#1A1A1F] border border-white/10 rounded-full px-4 py-2 mb-6">
            <ShieldCheck className="w-4 h-4 text-[#00FF88]" />
            <span className="text-white/60 text-sm">Privacy Policy</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-4xl mx-auto">
            Privacy{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)' }}>
              Policy
            </span>
          </h1>
          <p className="mt-4 text-white/50 text-base max-w-2xl mx-auto">
            Last updated: June 12, 2026 &middot; Smart Ride Uganda Limited
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
                  <ShieldCheck className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Smart Ride Uganda Limited (&ldquo;Smart Ride&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you use our mobile application, website, and related services (collectively, the &ldquo;Services&rdquo;).
                </p>
                <p>
                  We comply with the <span className="text-white font-medium">Uganda Data Protection and Privacy Act, 2019</span> and are committed to ensuring that your personal data is processed lawfully, fairly, and transparently. This policy applies to all Users of our Services, including riders, drivers, merchants, and health service providers.
                </p>
                <p>
                  By using our Services, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with the practices described herein, please discontinue use of our Services.
                </p>
              </div>
            </section>

            {/* 2. Data We Collect */}
            <section id="data-we-collect" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">2. Data We Collect</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-6 pl-0 sm:pl-13">
                <p>We collect the following categories of personal data:</p>

                {/* Identity Data */}
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCircle className="w-5 h-5 text-[#00FF88]" />
                    <h3 className="text-white font-semibold">2.1 Identity Data</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Full legal name</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Email address</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Phone number (verified via OTP)</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Profile photograph (if provided)</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />National ID or passport information (for driver/rider verification only)</li>
                  </ul>
                </div>

                {/* Location Data */}
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-[#00FF88]" />
                    <h3 className="text-white font-semibold">2.2 Location Data</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />GPS coordinates during active rides and deliveries</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Pickup and drop-off locations</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Real-time location tracking for driver/rider matching</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Location history for trip records and receipts</li>
                  </ul>
                </div>

                {/* Payment Data */}
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-[#00FF88]" />
                    <h3 className="text-white font-semibold">2.3 Payment Data</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Mobile money transaction IDs (MTN MoMo, Airtel Money)</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Smart Ride Wallet balance and transaction history</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Payment method preferences</li>
                  </ul>
                  <p className="mt-3 text-xs text-white/40 italic">
                    We do NOT collect or store full payment card details, PINs, or mobile money passwords. Payment processing is handled directly by MTN MoMo and Airtel Money.
                  </p>
                </div>

                {/* Device Data */}
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-[#00FF88]" />
                    <h3 className="text-white font-semibold">2.4 Device Data</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Device type and model</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Operating system and version</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />App version</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Device identifiers for push notifications</li>
                  </ul>
                </div>

                {/* Usage Data */}
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-[#00FF88]" />
                    <h3 className="text-white font-semibold">2.5 Usage Data</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Rides taken and orders placed</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Ratings and reviews given</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />App interaction patterns and feature usage</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Search queries and browsing history within the app</li>
                  </ul>
                </div>

                {/* Communication Data */}
                <div className="bg-[#1A1A1F] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-[#00FF88]" />
                    <h3 className="text-white font-semibold">2.6 Communication Data</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />In-app chat messages between Users and service providers</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Support ticket communications</li>
                    <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />Call records (via masked calling — actual phone numbers are not disclosed)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. How We Use Data */}
            <section id="how-we-use-data" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">3. How We Use Your Data</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>We use your personal data for the following purposes:</p>
                <ul className="space-y-3">
                  {[
                    { title: 'Service Delivery', desc: 'To match you with riders, drivers, and merchants; process ride bookings and delivery orders; and provide real-time tracking.' },
                    { title: 'Matching & Dispatch', desc: 'To connect Users with nearby service providers based on location, availability, and service type.' },
                    { title: 'Payment Processing', desc: 'To process payments via mobile money, manage wallet balances, issue refunds, and generate receipts.' },
                    { title: 'Safety & Security', desc: 'To verify User identities, monitor for fraudulent activity, enable SOS features, and investigate safety incidents.' },
                    { title: 'Customer Support', desc: 'To respond to your inquiries, resolve disputes, and provide technical assistance.' },
                    { title: 'Service Improvement', desc: 'To analyze usage patterns, improve app performance, develop new features, and personalize your experience.' },
                    { title: 'Legal Compliance', desc: 'To comply with applicable laws, regulations, and legal processes in Uganda.' },
                  ].map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 text-[#00FF88] mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-white font-medium">{item.title}:</span> {item.desc}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 4. Legal Basis */}
            <section id="legal-basis" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">4. Legal Basis for Processing</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>We process your personal data under the following legal bases, as permitted by the Uganda Data Protection and Privacy Act, 2019:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  {[
                    { title: 'Contract Performance', desc: 'Processing necessary to fulfill our contractual obligations to provide the Services you have requested.' },
                    { title: 'Legitimate Interest', desc: 'Processing for our legitimate business interests, such as fraud prevention, service improvement, and security.' },
                    { title: 'Consent', desc: 'Processing based on your explicit consent, such as for marketing communications and analytics.' },
                    { title: 'Legal Obligation', desc: 'Processing necessary to comply with legal obligations under Ugandan law, including financial record-keeping.' },
                  ].map((item) => (
                    <div key={item.title} className="bg-[#1A1A1F] rounded-xl p-4 border border-white/5">
                      <span className="text-white text-sm font-medium block mb-1">{item.title}</span>
                      <p className="text-white/40 text-xs">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p>
                  Where we rely on consent, you may withdraw your consent at any time by contacting us at <a href="mailto:privacy@smartride.ug" className="text-[#00FF88] hover:underline">privacy@smartride.ug</a>. Withdrawal of consent will not affect the lawfulness of processing carried out prior to withdrawal.
                </p>
              </div>
            </section>

            {/* 5. Data Sharing */}
            <section id="data-sharing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">5. Data Sharing</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>We may share your personal data with the following categories of recipients:</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#00FF88] text-xs font-bold">1</span>
                    </div>
                    <div>
                      <span className="text-white font-medium">Riders and Drivers</span>
                      <p className="text-sm">We share your name, pickup location, and drop-off location with matched riders or drivers for the purpose of fulfilling your ride or delivery request. Your phone number is masked through our in-app calling feature.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#00FF88] text-xs font-bold">2</span>
                    </div>
                    <div>
                      <span className="text-white font-medium">Merchants and Health Service Providers</span>
                      <p className="text-sm">We share your name, delivery address, and order details with merchants and pharmacies to fulfill your orders.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#00FF88] text-xs font-bold">3</span>
                    </div>
                    <div>
                      <span className="text-white font-medium">Payment Processors</span>
                      <p className="text-sm">We share transaction data with MTN MoMo and Airtel Money for payment processing. We do not share your full payment credentials.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#00FF88] text-xs font-bold">4</span>
                    </div>
                    <div>
                      <span className="text-white font-medium">Law Enforcement</span>
                      <p className="text-sm">We may disclose personal data to law enforcement agencies when required by law, court order, or governmental regulation, or when we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.</p>
                    </div>
                  </li>
                </ul>
                <p>
                  Smart Ride does not sell your personal data to third parties for marketing purposes.
                </p>
              </div>
            </section>

            {/* 6. Data Retention */}
            <section id="data-retention" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">6. Data Retention</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected:</p>
                <div className="bg-[#1A1A1F] rounded-xl overflow-hidden border border-white/5">
                  <div className="grid grid-cols-2 gap-0">
                    {[
                      { category: 'Active Accounts', period: 'Retained for the duration of account activity', color: '#00FF88' },
                      { category: 'Closed Accounts', period: '3 years from account closure', color: '#00FF88' },
                      { category: 'Financial Records', period: '7 years (per Ugandan tax regulations)', color: '#F59E0B' },
                      { category: 'Safety Records', period: '5 years from incident date', color: '#F43F5E' },
                    ].map((item, index) => (
                      <div key={item.category} className={`p-4 ${index % 2 === 0 ? 'border-r border-white/5' : ''} ${index < 2 ? 'border-b border-white/5' : ''}`}>
                        <p className="text-white text-sm font-medium mb-1">{item.category}</p>
                        <p className="text-white/40 text-xs" style={{ color: item.color + '99' }}>{item.period}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p>
                  After the applicable retention period, your personal data will be securely deleted or anonymized so that it can no longer be associated with you.
                </p>
              </div>
            </section>

            {/* 7. Your Rights */}
            <section id="your-rights" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">7. Your Rights</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Under the Uganda Data Protection and Privacy Act, 2019, you have the following rights regarding your personal data:
                </p>
                <div className="space-y-3">
                  {[
                    { title: 'Right of Access', desc: 'You have the right to request a copy of the personal data we hold about you. We will provide this information within thirty (30) days of receiving a verified request.' },
                    { title: 'Right to Rectification', desc: 'You have the right to request correction of any inaccurate or incomplete personal data we hold about you. You can update most information directly through the app settings.' },
                    { title: 'Right to Erasure', desc: 'You have the right to request deletion of your personal data, subject to certain exceptions such as legal obligations, financial record-keeping requirements, and pending disputes.' },
                    { title: 'Right to Data Portability', desc: 'You have the right to request your personal data in a structured, commonly used, and machine-readable format, enabling you to transfer it to another service provider.' },
                    { title: 'Right to Object', desc: 'You have the right to object to the processing of your personal data for direct marketing purposes or when processing is based on legitimate interests. We will cease processing unless we have compelling legitimate grounds.' },
                  ].map((item) => (
                    <div key={item.title} className="bg-[#1A1A1F] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <ChevronRight className="w-4 h-4 text-[#00FF88]" />
                        <span className="text-white font-medium text-sm">{item.title}</span>
                      </div>
                      <p className="text-white/40 text-xs leading-relaxed ml-6">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p>
                  To exercise any of these rights, please contact our Data Protection Officer at <a href="mailto:privacy@smartride.ug" className="text-[#00FF88] hover:underline">privacy@smartride.ug</a>. We will respond to your request within thirty (30) days.
                </p>
              </div>
            </section>

            {/* 8. Security */}
            <section id="security" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">8. Data Security</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>We implement robust technical and organizational measures to protect your personal data:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  {[
                    { title: 'Encryption', desc: 'All data in transit is encrypted using TLS 1.3. Sensitive data at rest is encrypted using AES-256.' },
                    { title: 'Secure Servers', desc: 'Data is stored on secure servers with firewalls, intrusion detection systems, and regular security patches.' },
                    { title: 'Access Controls', desc: 'Strict role-based access controls ensure only authorized personnel can access personal data.' },
                    { title: 'Regular Audits', desc: 'We conduct periodic security audits and penetration testing to identify and address vulnerabilities.' },
                  ].map((item) => (
                    <div key={item.title} className="bg-[#1A1A1F] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-[#00FF88]" />
                        <span className="text-white text-sm font-medium">{item.title}</span>
                      </div>
                      <p className="text-white/40 text-xs">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p>
                  While we strive to protect your personal data, no method of electronic transmission or storage is completely secure. We cannot guarantee absolute security, but we are committed to maintaining the highest commercially reasonable security standards.
                </p>
              </div>
            </section>

            {/* 9. Children */}
            <section id="children" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Baby className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">9. Children&apos;s Privacy</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Smart Ride does not provide Services to persons under the age of eighteen (18). We do not knowingly collect personal data from children. If we become aware that we have inadvertently collected personal data from a person under 18, we will take immediate steps to delete such data.
                </p>
                <p>
                  If you are a parent or guardian and believe your child has provided us with personal data, please contact us at <a href="mailto:privacy@smartride.ug" className="text-[#00FF88] hover:underline">privacy@smartride.ug</a> and we will take appropriate action.
                </p>
              </div>
            </section>

            {/* 10. Cookies */}
            <section id="cookies" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">10. Cookies &amp; Tracking</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">10.1 Essential Cookies.</span> We use essential cookies that are necessary for the functioning of our website and app, including session management, authentication, and security features. These cookies cannot be disabled.</p>
                <p><span className="text-white font-medium">10.2 Analytics Cookies.</span> We may use analytics cookies to understand how Users interact with our Services. Analytics cookies are only activated with your explicit consent, which you can provide or withdraw at any time through the app settings.</p>
                <p><span className="text-white font-medium">10.3 Third-Party Tracking.</span> We do not permit third-party advertising networks to track your activity on our platform. Any third-party tools used (such as crash reporting) are configured to minimize data collection.</p>
              </div>
            </section>

            {/* 11. Changes */}
            <section id="changes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">11. Changes to This Policy</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-1 flex-shrink-0" />Sending an in-app notification before the changes take effect</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-1 flex-shrink-0" />Sending an email to the address associated with your account</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-[#00FF88] mt-1 flex-shrink-0" />Updating the &ldquo;Last updated&rdquo; date at the top of this policy</li>
                </ul>
                <p>
                  We encourage you to review this Privacy Policy periodically. Your continued use of the Services after any changes constitutes your acceptance of the updated policy.
                </p>
              </div>
            </section>

            {/* 12. Contact */}
            <section id="contact" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">12. Contact Information</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer:
                </p>
                <div className="bg-[#1A1A1F] rounded-xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Data Protection Officer</p>
                      <a href="mailto:privacy@smartride.ug" className="text-white hover:text-[#00FF88] transition-colors duration-200">privacy@smartride.ug</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Company</p>
                      <p className="text-white">Smart Ride Uganda Limited</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Address</p>
                      <p className="text-white">Kampala, Uganda</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">General Support</p>
                      <a href="mailto:support@smartride.ug" className="text-white hover:text-[#00FF88] transition-colors duration-200">support@smartride.ug</a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Back to Home */}
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">
              Effective Date: June 12, 2026 &middot; &copy; {new Date().getFullYear()} Smart Ride Uganda Limited
            </p>
            <div className="flex items-center gap-6">
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
              <Link href="/terms" className="text-white/40 hover:text-white transition-colors duration-200">Terms</Link>
              <Link href="/privacy" className="text-white/40 hover:text-white transition-colors duration-200">Privacy</Link>
              <Link href="/" className="text-white/40 hover:text-white transition-colors duration-200">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
