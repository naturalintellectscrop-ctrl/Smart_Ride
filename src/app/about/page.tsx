'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
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
              <Link href="/about" className="text-white transition-colors">About</Link>
              <Link href="/help" className="text-slate-300 hover:text-white transition-colors">Help</Link>
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
            About <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Smart Ride</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Revolutionizing mobility and delivery services in Uganda, one ride at a time.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
                <p className="text-slate-300 text-lg mb-4">
                  Smart Ride is Uganda's premier multi-service mobility platform, designed to make everyday life easier for millions of people across the country. We connect riders with safe and affordable transportation, customers with their favorite restaurants and stores, and create economic opportunities for thousands of drivers and merchants.
                </p>
                <p className="text-slate-300 text-lg">
                  Our mission is to provide accessible, reliable, and affordable services that empower communities and drive economic growth across Uganda.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                  <svg className="w-32 h-32 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Ride</h3>
              <p className="text-slate-400 text-sm">Safe and affordable Boda Boda and Car rides across Uganda.</p>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Food</h3>
              <p className="text-slate-400 text-sm">Order from local restaurants with fast delivery to your door.</p>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Delivery</h3>
              <p className="text-slate-400 text-sm">Send packages and documents across town reliably.</p>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Shopping</h3>
              <p className="text-slate-400 text-sm">Groceries, pharmacy, and more from local stores.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Driver Section */}
      <section id="drivers" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-900/50 to-cyan-900/50 rounded-3xl p-8 md:p-12 border border-slate-700/50">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Become a Driver or Rider</h2>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                Join our platform and start earning on your own schedule. Whether you ride a Boda, drive a Car, or deliver packages — there's an opportunity for you.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Smart Boda</h3>
                <p className="text-slate-400 text-sm mb-4">Ride your Boda Boda and earn money giving rides and making deliveries.</p>
                <ul className="text-left text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Flexible hours
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Weekly payouts
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    In-app navigation
                  </li>
                </ul>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Smart Car</h3>
                <p className="text-slate-400 text-sm mb-4">Drive your car and provide comfortable rides to customers.</p>
                <ul className="text-left text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Higher fares
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Long-distance trips
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Premium customers
                  </li>
                </ul>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Merchant Partner</h3>
                <p className="text-slate-400 text-sm mb-4">Sell your products through our platform and reach more customers.</p>
                <ul className="text-left text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Restaurant partner
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Grocery store
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Pharmacy/Health
                  </li>
                </ul>
              </div>
            </div>
            <div className="text-center mt-8">
              <a 
                href="https://play.google.com/store" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/30"
              >
                Start Earning Today
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">10K+</div>
              <div className="text-slate-400">Active Riders</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">50K+</div>
              <div className="text-slate-400">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">100K+</div>
              <div className="text-slate-400">Completed Rides</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">500+</div>
              <div className="text-slate-400">Partner Merchants</div>
            </div>
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
