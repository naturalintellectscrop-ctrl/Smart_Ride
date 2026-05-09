'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I book a ride?",
      answer: "Open the Smart Ride app, select your pickup location on the map, choose your destination, and select your preferred ride type (Smart Boda or Smart Car). Confirm your booking and a nearby rider will be assigned to you."
    },
    {
      question: "What payment methods are accepted?",
      answer: "Smart Ride accepts MTN Mobile Money, Airtel Money, and cash payments. You can add your preferred payment method in the app settings for faster checkout."
    },
    {
      question: "How do I become a driver or rider?",
      answer: "Download the Smart Ride app and select 'Become a Rider' during registration. You'll need to provide your personal details, vehicle information, and valid documents (National ID, driving license). Our team will review your application and approve it within 24-48 hours."
    },
    {
      question: "How do I track my order or ride?",
      answer: "Once your booking is confirmed, you'll see a live map showing your rider's location. You can track their progress in real-time until they reach your pickup location and throughout your journey."
    },
    {
      question: "What if I left something in the vehicle?",
      answer: "Go to your trip history in the app, select the specific trip, and use the 'Contact Rider' option. You can also contact our support team through the app or call our helpline."
    },
    {
      question: "How do I report an issue with my trip?",
      answer: "Open the app, go to 'Trip History', select the trip, and tap 'Report Issue'. Choose the appropriate category and describe your concern. Our support team will investigate and respond within 24 hours."
    },
    {
      question: "Can I schedule a ride in advance?",
      answer: "Yes! When booking a ride, tap on 'Schedule for Later' and select your preferred date and time. We'll automatically match you with a rider at your scheduled time."
    },
    {
      question: "How do refunds work?",
      answer: "If you were charged incorrectly or your trip was cancelled, you can request a refund through the app. Go to 'Trip History', select the trip, and tap 'Request Refund'. Refunds are typically processed within 3-5 business days."
    },
    {
      question: "Is Smart Ride available in my area?",
      answer: "Smart Ride currently operates in Kampala and surrounding areas, with expansion to other cities planned. Check the app to see if service is available in your location."
    },
    {
      question: "How do I become a merchant partner?",
      answer: "If you're a restaurant, grocery store, or pharmacy interested in partnering with Smart Ride, contact us at partners@smartride.ug or fill out the contact form on this website. Our partnerships team will reach out to discuss opportunities."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Smart Ride</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
              <Link href="/help" className="text-white transition-colors">Help</Link>
              <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/login" className="text-slate-300 hover:text-white transition-colors text-sm">
                Admin
              </Link>
              <a 
                href="https://play.google.com/store" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/25"
              >
                Get the App
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Help <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Center</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Find answers to common questions or reach out to our support team for assistance.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="#faqs" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/50 transition-all text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white font-medium">FAQs</span>
            </a>
            <Link href="/contact" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/50 transition-all text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-white font-medium">Contact Us</span>
            </Link>
            <a href="#safety" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/50 transition-all text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-white font-medium">Safety</span>
            </a>
            <a href="#payments" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/50 transition-all text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-white font-medium">Payments</span>
            </a>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between"
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-slate-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Safety Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Live Location Sharing</h3>
              <p className="text-slate-400 text-sm">Share your trip details and live location with friends and family for added security during your ride.</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">SOS Button</h3>
              <p className="text-slate-400 text-sm">In case of emergency, use the in-app SOS button to instantly alert our support team and local authorities.</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Verified Drivers</h3>
              <p className="text-slate-400 text-sm">All our drivers undergo thorough background checks and document verification before being approved on our platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payments Section */}
      <section id="payments" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Payment Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">MTN Mobile Money</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>• Pay directly from your MTN MoMo wallet</li>
                <li>• Instant payment confirmation</li>
                <li>• View transaction history in the app</li>
                <li>• Contact MTN: *165# or 100</li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Airtel Money</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>• Pay directly from your Airtel Money wallet</li>
                <li>• Instant payment confirmation</li>
                <li>• View transaction history in the app</li>
                <li>• Contact Airtel: *185# or 100</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Still Need Help?</h2>
          <p className="text-slate-400 mb-8">Our support team is available 24/7 to assist you with any questions or issues.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </Link>
            <a 
              href="tel:+256700123456"
              className="inline-flex items-center justify-center gap-2 bg-slate-700/50 border border-slate-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-700 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Smart Ride</span>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
