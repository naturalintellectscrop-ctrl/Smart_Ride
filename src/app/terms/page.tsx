'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  FileText,
  Car,
  UtensilsCrossed,
  Package,
  Shield,
  CreditCard,
  AlertTriangle,
  Scale,
  Lock,
  UserX,
  Gavel,
  RefreshCw,
  Phone,
  Mail,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

const tocSections = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'service-description', label: 'Service Description' },
  { id: 'user-accounts', label: 'User Accounts' },
  { id: 'ride-services', label: 'Ride Services' },
  { id: 'delivery-services', label: 'Delivery Services' },
  { id: 'payment-terms', label: 'Payment Terms' },
  { id: 'user-conduct', label: 'User Conduct' },
  { id: 'liability', label: 'Liability' },
  { id: 'data-privacy', label: 'Data & Privacy' },
  { id: 'termination', label: 'Termination' },
  { id: 'dispute-resolution', label: 'Dispute Resolution' },
  { id: 'modifications', label: 'Modifications' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsPage() {
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
            <FileText className="w-4 h-4 text-[#00FF88]" />
            <span className="text-white/60 text-sm">Legal Document</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-4xl mx-auto">
            Terms of{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)' }}>
              Service
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
            {/* 1. Acceptance of Terms */}
            <section id="acceptance" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  By accessing, downloading, or using the Smart Ride mobile application, website, or any related services (collectively, the &ldquo;Services&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you must not use our Services.
                </p>
                <p>
                  These Terms constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;, or &ldquo;your&rdquo;) and Smart Ride Uganda Limited (&ldquo;Smart Ride&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a company registered under the laws of the Republic of Uganda.
                </p>
                <p>
                  You acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our <Link href="/privacy" className="text-[#00FF88] hover:underline">Privacy Policy</Link>, which is incorporated herein by reference.
                </p>
              </div>
            </section>

            {/* 2. Service Description */}
            <section id="service-description" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">2. Service Description</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Smart Ride is a multi-service technology platform operating in Uganda that connects users with independent third-party service providers. Our Services include, but are not limited to:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  {[
                    { icon: Car, title: 'Ride-Hailing', desc: 'Boda boda and car rides through Smart Boda and Smart Car services' },
                    { icon: UtensilsCrossed, title: 'Food Delivery', desc: 'Restaurant food ordering and delivery through Smart Food' },
                    { icon: Package, title: 'Package Delivery', desc: 'Parcel and package delivery services across Uganda' },
                    { icon: Shield, title: 'Health & Pharmacy', desc: 'Medicine and healthcare product delivery through Smart Health' },
                  ].map((item) => (
                    <div key={item.title} className="bg-[#1A1A1F] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="w-4 h-4 text-[#00FF88]" />
                        <span className="text-white text-sm font-medium">{item.title}</span>
                      </div>
                      <p className="text-white/40 text-xs">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p>
                  Smart Ride acts solely as an intermediary platform that connects Users with Riders, Drivers, Merchants, and Health Service Providers. We do not provide transportation, delivery, or healthcare services directly. All services are provided by independent third-party contractors who are not employees of Smart Ride.
                </p>
              </div>
            </section>

            {/* 3. User Accounts */}
            <section id="user-accounts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">3. User Accounts</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">3.1 Registration.</span> To use our Services, you must create an account by providing accurate and complete information, including your full name, phone number, and email address. You must verify your phone number through our OTP verification process.</p>
                <p><span className="text-white font-medium">3.2 Age Requirement.</span> You must be at least eighteen (18) years of age to create an account and use our Services. By creating an account, you represent and warrant that you are at least 18 years old.</p>
                <p><span className="text-white font-medium">3.3 Account Security.</span> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify Smart Ride immediately of any unauthorized use of your account by contacting <a href="mailto:support@smartride.ug" className="text-[#00FF88] hover:underline">support@smartride.ug</a>.</p>
                <p><span className="text-white font-medium">3.4 Account Accuracy.</span> You agree to update your account information promptly to keep it accurate and complete. Providing false or misleading information may result in immediate account suspension.</p>
                <p><span className="text-white font-medium">3.5 One Account Per Person.</span> Each User may maintain only one active account. Creating multiple accounts may result in suspension of all associated accounts.</p>
              </div>
            </section>

            {/* 4. Ride Services */}
            <section id="ride-services" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">4. Ride Services</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">4.1 Booking.</span> When you request a ride through the Smart Ride platform, we will attempt to match you with an available Rider or Driver. Match availability is not guaranteed and may depend on your location, time of day, and driver availability.</p>
                <p><span className="text-white font-medium">4.2 Cancellations.</span> You may cancel a ride request before a Rider or Driver arrives at your pickup location. However, repeated cancellations may incur a cancellation fee as displayed in the app at the time of cancellation. A cancellation fee of UGX 2,000 may apply if you cancel more than two (2) minutes after a driver has accepted your request.</p>
                <p><span className="text-white font-medium">4.3 No-Show Policy.</span> If you fail to appear at the designated pickup location within five (5) minutes of the Rider or Driver&apos;s arrival, the driver may mark you as a &ldquo;no-show.&rdquo; A no-show fee equal to the base fare of the ride will be charged to your account.</p>
                <p><span className="text-white font-medium">4.4 Fare Disputes.</span> If you believe you have been overcharged for a ride, you may submit a fare dispute through the app within 48 hours of the ride completion. Smart Ride will review the dispute and, if validated, will credit the difference to your Smart Ride wallet within 5 business days.</p>
                <p><span className="text-white font-medium">4.5 Route and ETA.</span> Estimated times of arrival and routes provided in the app are estimates only and may vary due to traffic, weather, road conditions, or other factors beyond our control.</p>
              </div>
            </section>

            {/* 5. Delivery Services */}
            <section id="delivery-services" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">5. Delivery Services</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">5.1 Food Orders.</span> Through Smart Food, you may order food from participating restaurants and merchants. All food preparation and quality are the sole responsibility of the merchant. Smart Ride does not guarantee the quality, safety, or suitability of any food items ordered through the platform.</p>
                <p><span className="text-white font-medium">5.2 Package Delivery.</span> When using our package delivery service, you warrant that the package does not contain any illegal, hazardous, dangerous, or prohibited items. You must ensure that packages are properly sealed and labeled before handover to the delivery rider.</p>
                <p><span className="text-white font-medium">5.3 Merchant Responsibilities.</span> Merchants partnering with Smart Ride are responsible for the accuracy of their menu listings, product descriptions, pricing, and the quality of items prepared for delivery. Any disputes regarding the quality or accuracy of delivered items should first be directed to the merchant, and subsequently to Smart Ride support.</p>
                <p><span className="text-white font-medium">5.4 Delivery Times.</span> Estimated delivery times are approximate and may be affected by merchant preparation time, rider availability, traffic conditions, and weather. Smart Ride shall not be liable for delays in delivery.</p>
                <p><span className="text-white font-medium">5.5 Prohibited Items.</span> You may not use our delivery services to send or receive illegal substances, weapons, explosives, flammable materials, live animals, or any items prohibited under the laws of Uganda.</p>
              </div>
            </section>

            {/* 6. Payment Terms */}
            <section id="payment-terms" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">6. Payment Terms</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">6.1 Accepted Payment Methods.</span> Smart Ride accepts the following payment methods:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Cash payments directly to the Rider or Driver</li>
                  <li>MTN Mobile Money (MoMo)</li>
                  <li>Airtel Money</li>
                  <li>Smart Ride Wallet balance</li>
                </ul>
                <p><span className="text-white font-medium">6.2 Fare Collection.</span> All fares are displayed in Uganda Shillings (UGX). Fares are calculated based on distance, time, demand, and applicable surcharges. You agree to pay the total fare displayed at the completion of the service, including any applicable tolls, surcharges, or fees.</p>
                <p><span className="text-white font-medium">6.3 Refund Policy.</span> Rides cancelled within two (2) minutes of a driver accepting the request are eligible for a full refund. Refunds for other scenarios will be evaluated on a case-by-case basis. Refunds will be credited to your Smart Ride wallet or original payment method within 5&ndash;7 business days.</p>
                <p><span className="text-white font-medium">6.4 Mobile Money Transactions.</span> Mobile money payments are processed through MTN MoMo and Airtel Money. Smart Ride is not responsible for any delays or failures in mobile money transactions caused by the respective mobile network operators.</p>
                <p><span className="text-white font-medium">6.5 Pricing Changes.</span> Smart Ride reserves the right to modify pricing, including base fares, per-kilometer rates, and surge pricing, at any time. Current pricing will always be displayed in the app before you confirm a booking.</p>
              </div>
            </section>

            {/* 7. User Conduct */}
            <section id="user-conduct" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">7. User Conduct</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>You agree not to engage in any of the following prohibited behaviors while using our Services:</p>
                <ul className="space-y-3">
                  {[
                    { title: 'Harassment', desc: 'Engaging in verbal, physical, or sexual harassment of Riders, Drivers, Merchants, or other Users.' },
                    { title: 'Substance Abuse', desc: 'Being under the influence of alcohol, drugs, or any substance that impairs your ability to safely interact with service providers.' },
                    { title: 'Property Damage', desc: 'Damaging or defacing the vehicle, delivery items, or any property belonging to Riders, Drivers, Merchants, or Smart Ride.' },
                    { title: 'Fraudulent Bookings', desc: 'Making fake bookings, using stolen payment methods, or attempting to manipulate the platform for financial gain.' },
                    { title: 'Safety Violations', desc: 'Refusing to wear a helmet (for boda boda rides), engaging in dangerous behavior, or asking the driver to violate traffic laws.' },
                    { title: 'Discrimination', desc: 'Discriminating against any person based on race, ethnicity, gender, religion, disability, or any other protected characteristic.' },
                  ].map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 text-[#00FF88] mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-white font-medium">{item.title}:</span> {item.desc}
                      </div>
                    </li>
                  ))}
                </ul>
                <p>
                  Any violation of these conduct standards may result in immediate account suspension or termination, and may be reported to relevant law enforcement authorities.
                </p>
              </div>
            </section>

            {/* 8. Liability */}
            <section id="liability" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">8. Limitation of Liability</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">8.1 Platform Role.</span> Smart Ride is a technology platform that connects Users with independent service providers. We do not provide transportation, delivery, or healthcare services directly and are not a party to the service contract between you and the service provider.</p>
                <p><span className="text-white font-medium">8.2 Third-Party Actions.</span> Smart Ride shall not be liable for any acts, omissions, negligence, or misconduct of Riders, Drivers, Merchants, Health Service Providers, or any other third parties. This includes, but is not limited to, personal injury, property damage, delay, or failure to deliver services.</p>
                <p><span className="text-white font-medium">8.3 Maximum Liability.</span> To the fullest extent permitted by law, Smart Ride&apos;s total aggregate liability for any claim arising out of or related to these Terms or the Services shall not exceed the total fare paid by you for the specific service giving rise to the claim.</p>
                <p><span className="text-white font-medium">8.4 Indirect Damages.</span> Smart Ride shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, regardless of the cause of action or theory of liability.</p>
                <p><span className="text-white font-medium">8.5 Service Availability.</span> Smart Ride does not guarantee that the Services will be available at all times or without interruption. We shall not be liable for any downtime, server outages, or technical failures.</p>
              </div>
            </section>

            {/* 9. Data & Privacy */}
            <section id="data-privacy" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">9. Data &amp; Privacy</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Your privacy is important to us. Our collection, use, and disclosure of personal data is governed by our <Link href="/privacy" className="text-[#00FF88] hover:underline">Privacy Policy</Link>, which forms an integral part of these Terms.
                </p>
                <p>
                  By using our Services, you consent to the collection and processing of your personal data as described in our Privacy Policy, including location data during rides and deliveries, payment transaction data, and device information necessary for service delivery.
                </p>
                <p>
                  Smart Ride complies with the Uganda Data Protection and Privacy Act, 2019, and is committed to safeguarding your personal data in accordance with applicable laws.
                </p>
              </div>
            </section>

            {/* 10. Termination */}
            <section id="termination" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <UserX className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">10. Termination</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">10.1 Your Right to Terminate.</span> You may terminate your account at any time by contacting our support team or through the account settings in the app. Upon termination, your right to use the Services will immediately cease.</p>
                <p><span className="text-white font-medium">10.2 Our Right to Suspend/Terminate.</span> Smart Ride reserves the right to suspend or terminate your account, without prior notice, for any of the following reasons:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Violation of these Terms of Service</li>
                  <li>Fraudulent, abusive, or dangerous behavior</li>
                  <li>Repeated complaints from other Users or service providers</li>
                  <li>Failure to pay for services rendered</li>
                  <li>Any activity that may harm Smart Ride, its Users, or third parties</li>
                </ul>
                <p><span className="text-white font-medium">10.3 Effect of Termination.</span> Upon termination, any outstanding balances on your account will become immediately due. Smart Ride reserves the right to retain certain data as required by law or as outlined in our Privacy Policy.</p>
              </div>
            </section>

            {/* 11. Dispute Resolution */}
            <section id="dispute-resolution" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Gavel className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">11. Dispute Resolution</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p><span className="text-white font-medium">11.1 Governing Law.</span> These Terms shall be governed by and construed in accordance with the laws of the Republic of Uganda, without regard to its conflict of law principles.</p>
                <p><span className="text-white font-medium">11.2 Arbitration.</span> Any dispute, claim, or controversy arising out of or relating to these Terms or the Services shall be resolved through binding arbitration administered by the Uganda Arbitration and Conciliation Centre in Kampala, Uganda, in accordance with the Arbitration and Conciliation Act, Cap 4, Laws of Uganda.</p>
                <p><span className="text-white font-medium">11.3 Informal Resolution.</span> Before initiating arbitration, you agree to first attempt to resolve the dispute informally by contacting our support team. We will attempt to resolve the dispute within thirty (30) days.</p>
                <p><span className="text-white font-medium">11.4 Jurisdiction.</span> For any matters not subject to arbitration, the courts of Kampala, Uganda shall have exclusive jurisdiction.</p>
              </div>
            </section>

            {/* 12. Modifications */}
            <section id="modifications" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">12. Modifications</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  Smart Ride reserves the right to update, modify, or replace these Terms at any time at its sole discretion. When we make material changes, we will notify you through:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>In-app notification at least seven (7) days before the changes take effect</li>
                  <li>Email notification to the address associated with your account</li>
                  <li>A prominent notice on our website</li>
                </ul>
                <p>
                  Your continued use of the Services after the effective date of any modifications constitutes your acceptance of the updated Terms. If you do not agree with the modified Terms, you must discontinue use of the Services and terminate your account.
                </p>
              </div>
            </section>

            {/* 13. Contact */}
            <section id="contact" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">13. Contact Information</h2>
              </div>
              <div className="text-white/60 leading-relaxed space-y-4 pl-0 sm:pl-13">
                <p>
                  If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us:
                </p>
                <div className="bg-[#1A1A1F] rounded-xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Email</p>
                      <a href="mailto:support@smartride.ug" className="text-white hover:text-[#00FF88] transition-colors duration-200">support@smartride.ug</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Phone</p>
                      <a href="tel:+256700123456" className="text-white hover:text-[#00FF88] transition-colors duration-200">+256 700 123 456</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Company</p>
                      <p className="text-white">Smart Ride Uganda Limited, Kampala, Uganda</p>
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
              <Link href="/privacy" className="text-white/40 hover:text-[#00FF88] text-sm transition-colors duration-200">
                Privacy Policy
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
              <Link href="/" className="text-white/40 hover:text-white transition-colors duration-200">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
