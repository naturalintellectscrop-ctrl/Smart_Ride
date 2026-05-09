'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

// ============================================
// SMART RIDE - HELP PAGE
// ============================================

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How do I book a ride on Smart Ride?",
    answer: "Open the Smart Ride app, enter your destination in the search bar, select your preferred ride type (Boda Boda or Car), and tap 'Request'. A nearby driver will be matched to you within minutes."
  },
  {
    question: "What payment methods are accepted?",
    answer: "Smart Ride accepts MTN Mobile Money, Airtel Money, and cash payments. You can add your preferred payment method in the app settings for a seamless experience."
  },
  {
    question: "How do I track my ride?",
    answer: "Once a driver is assigned, you'll see their location on the map in real-time. You can also see their name, photo, vehicle details, and contact them directly through the app."
  },
  {
    question: "Can I schedule a ride in advance?",
    answer: "Yes! You can schedule rides up to 7 days in advance. Simply tap the clock icon when booking and select your preferred pickup date and time."
  },
  {
    question: "How do I cancel a ride?",
    answer: "You can cancel a ride by tapping 'Cancel Ride' in the app. Note that cancellation fees may apply if the driver is already on their way to your pickup location."
  },
  {
    question: "What is Smart Food?",
    answer: "Smart Food is our food delivery service that lets you order from hundreds of local restaurants. Browse menus, place your order, and track delivery in real-time."
  },
  {
    question: "How do I become a driver partner?",
    answer: "Download the Smart Ride Driver app from the Play Store, create an account, submit your documents (ID, license, vehicle registration), and once verified, you can start accepting ride requests and earning."
  },
  {
    question: "Is my personal information secure?",
    answer: "Yes, we take data security seriously. All personal information is encrypted and stored securely. We never share your data with third parties without your consent."
  },
  {
    question: "What should I do if I left something in a ride?",
    answer: "Go to 'Your Rides' in the app, select the specific trip, and tap 'I lost an item'. You can contact the driver directly or report it to our support team for assistance."
  },
  {
    question: "How do I contact customer support?",
    answer: "You can reach our support team through the app by going to Help > Contact Support, or email us at support@smartride.ug. We're available 24/7 to assist you."
  },
];

function FAQAccordion({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="text-white font-medium pr-8">{item.question}</span>
        <svg 
          className={`w-5 h-5 text-[#00FF88] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}
      >
        <p className="text-white/60 leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0D0D12] font-['Inter',sans-serif]">
      
      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D12]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">About</Link>
              <Link href="/help" className="text-[#00FF88] text-sm font-medium">Help</Link>
              <Link href="/contact" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Contact</Link>
              <Link href="/blog" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Blog</Link>
            </div>
            
            <a 
              href="https://play.google.com/store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#00FF88]/30 transition-all duration-300 hover:scale-105"
            >
              Get the App
            </a>
          </div>
        </div>
      </nav>

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF88] rounded-full blur-[128px] opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFF3] rounded-full blur-[128px] opacity-10" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
              How Can We{' '}
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                }}
              >
                Help?
              </span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Find answers to common questions or get in touch with our support team.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* QUICK HELP CARDS */}
      {/* ============================================ */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-[#00FF88]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Getting Started</h3>
              <p className="text-white/50 text-sm">Learn the basics of using Smart Ride</p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#F59E0B]/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Payments</h3>
              <p className="text-white/50 text-sm">Payment methods and billing</p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#3B82F6]/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Safety</h3>
              <p className="text-white/50 text-sm">Your safety is our priority</p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#8B5CF6]/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">For Drivers</h3>
              <p className="text-white/50 text-sm">Driver partner resources</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FAQ SECTION */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="bg-[#1A1A1F] rounded-2xl border border-white/5 px-6">
            {faqData.map((item, index) => (
              <FAQAccordion
                key={index}
                item={item}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SAFETY INFO */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
            Your Safety Matters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-[#00FF88]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Verified Drivers</h3>
              <p className="text-white/60 text-sm">
                All our drivers undergo thorough background checks and verification before joining our platform.
              </p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-[#00FF88]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Tracking</h3>
              <p className="text-white/60 text-sm">
                Share your trip with loved ones in real-time. They can see your location until you arrive safely.
              </p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-[#00FF88]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">24/7 Support</h3>
              <p className="text-white/60 text-sm">
                Our support team is available around the clock to assist with any issues or emergencies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PAYMENT INFO */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
            Payment Options
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#FFCC00]/20 hover:border-[#FFCC00]/40 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-[#FFCC00] rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-[#0D0D12] font-bold text-lg">MTN</span>
              </div>
              <h3 className="text-white font-semibold mb-1">MTN MoMo</h3>
              <p className="text-white/50 text-sm">Pay directly from your MTN Mobile Money account</p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#ED1C24]/20 hover:border-[#ED1C24]/40 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-[#ED1C24] rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Airtel Money</h3>
              <p className="text-white/50 text-sm">Use your Airtel Money wallet for seamless payments</p>
            </div>
            
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#00FF88]/20 hover:border-[#00FF88]/40 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00FF88] to-[#00FFF3] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Cash</h3>
              <p className="text-white/50 text-sm">Pay with cash directly to your driver</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CONTACT CTA */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Still need help?
          </h2>
          <p className="text-white/60 mb-8">
            Our support team is available 24/7 to assist you with any questions or concerns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-[#00FF88]/30 transition-all duration-300 hover:scale-105"
            >
              Contact Support
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a 
              href="mailto:support@smartride.ug"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/5 transition-all duration-300"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <Logo />
              <p className="text-white/50 max-w-md mb-6 leading-relaxed mt-6">
                Uganda's premier mobility platform. Connecting riders, drivers, and businesses for seamless transportation and delivery services.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">About Us</Link></li>
                <li><Link href="/help" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Help Center</Link></li>
                <li><Link href="/contact" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Contact</Link></li>
                <li><Link href="/blog" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Contact</h4>
              <ul className="space-y-4">
                <li className="text-white/50">
                  <span className="text-white">Email:</span>{' '}
                  <a href="mailto:support@smartride.ug" className="hover:text-[#00FF88] transition-colors duration-200">support@smartride.ug</a>
                </li>
                <li className="text-white/50">
                  <span className="text-white">Phone:</span>{' '}
                  <a href="tel:+256700123456" className="hover:text-[#00FF88] transition-colors duration-200">+256 700 123 456</a>
                </li>
                <li className="text-white/50">
                  <span className="text-white">Location:</span> Kampala, Uganda
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8">
            <p className="text-white/30 text-sm text-center">
              © {new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
