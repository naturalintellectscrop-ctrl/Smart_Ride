'use client';

import React from 'react';
import Link from 'next/link';

// ============================================
// SMART RIDE - ABOUT PAGE
// ============================================

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0D0D12] font-['Inter',sans-serif]">
      
      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D12]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00FF88] to-[#00FFF3] rounded-xl flex items-center justify-center shadow-lg shadow-[#00FF88]/20">
                <svg className="w-6 h-6 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Smart Ride</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-[#00FF88] text-sm font-medium">About</Link>
              <Link href="/help" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Help</Link>
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
      {/* HERO SECTION - 60vh */}
      {/* ============================================ */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
          }}
        />
        
        {/* Animated Glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#00FF88] rounded-full blur-[128px] opacity-15" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#00FFF3] rounded-full blur-[128px] opacity-15" />
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto">
            About{' '}
            <span 
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
              }}
            >
              Smart Ride
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Uganda's premier mobility platform revolutionizing transportation, delivery, and commerce across the region.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* MISSION SECTION */}
      {/* ============================================ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D0D12]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Our Mission
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-6">
                At Smart Ride, we believe that mobility should be accessible, affordable, and reliable for everyone. Our mission is to connect people with the services they need, when they need them, while creating economic opportunities for thousands of riders and drivers across Uganda.
              </p>
              <p className="text-white/60 text-lg leading-relaxed">
                Founded with a vision to transform urban mobility in East Africa, we've grown from a simple ride-hailing app to a comprehensive platform offering rides, food delivery, shopping, and healthcare services.
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#00FF88]/20 to-[#00FFF3]/20 rounded-3xl blur-2xl" />
              <div className="relative bg-[#1A1A1F] rounded-3xl p-8 border border-white/5">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-[#00FF88] mb-2">10K+</div>
                    <div className="text-white/50 text-sm">Active Riders</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-[#00FF88] mb-2">500K+</div>
                    <div className="text-white/50 text-sm">Happy Users</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-[#00FF88] mb-2">1M+</div>
                    <div className="text-white/50 text-sm">Trips Completed</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-[#00FF88] mb-2">50+</div>
                    <div className="text-white/50 text-sm">Cities Covered</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* STATISTICS SECTION */}
      {/* ============================================ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Transforming lives and businesses across Uganda since our inception.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat 1 */}
            <div className="bg-[#1A1A1F] rounded-2xl p-8 border border-[#00FF88]/20 text-center hover:border-[#00FF88]/40 transition-all duration-300 hover:-translate-y-1">
              <div className="text-5xl font-bold text-[#00FF88] mb-3">500K+</div>
              <div className="text-white font-medium mb-2">Active Users</div>
              <div className="text-white/40 text-sm">Growing every day</div>
            </div>
            
            {/* Stat 2 */}
            <div className="bg-[#1A1A1F] rounded-2xl p-8 border border-[#F59E0B]/20 text-center hover:border-[#F59E0B]/40 transition-all duration-300 hover:-translate-y-1">
              <div className="text-5xl font-bold text-[#F59E0B] mb-3">10K+</div>
              <div className="text-white font-medium mb-2">Partner Riders</div>
              <div className="text-white/40 text-sm">Earning on their terms</div>
            </div>
            
            {/* Stat 3 */}
            <div className="bg-[#1A1A1F] rounded-2xl p-8 border border-[#8B5CF6]/20 text-center hover:border-[#8B5CF6]/40 transition-all duration-300 hover:-translate-y-1">
              <div className="text-5xl font-bold text-[#8B5CF6] mb-3">1M+</div>
              <div className="text-white font-medium mb-2">Completed Trips</div>
              <div className="text-white/40 text-sm">Safe and reliable</div>
            </div>
            
            {/* Stat 4 */}
            <div className="bg-[#1A1A1F] rounded-2xl p-8 border border-[#3B82F6]/20 text-center hover:border-[#3B82F6]/40 transition-all duration-300 hover:-translate-y-1">
              <div className="text-5xl font-bold text-[#3B82F6] mb-3">50+</div>
              <div className="text-white font-medium mb-2">Cities Served</div>
              <div className="text-white/40 text-sm">Across Uganda</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SERVICES OVERVIEW */}
      {/* ============================================ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D0D12]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What We Offer
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Comprehensive services designed to make your life easier.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Ride */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#00FF88]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#00FF88] to-[#059669] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#00FF88]/20">
                <svg className="w-7 h-7 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Ride</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Book Boda Boda or Car rides instantly. Safe, affordable, and reliable transportation.
              </p>
            </div>
            
            {/* Food */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#F59E0B]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#F59E0B]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#F59E0B]/20">
                <svg className="w-7 h-7 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Food</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Order from local restaurants. Fast delivery to your doorstep in minutes.
              </p>
            </div>
            
            {/* Delivery */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#3B82F6]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#3B82F6]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#3B82F6]/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Delivery</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Send packages anywhere across town. Real-time tracking included.
              </p>
            </div>
            
            {/* Shopping */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#8B5CF6]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#8B5CF6]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#8B5CF6]/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Shopping</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Shop groceries and essentials from trusted local stores.
              </p>
            </div>
            
            {/* Health */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#F43F5E]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#F43F5E]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F43F5E] to-[#E11D48] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#F43F5E]/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Health</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Order medicines and healthcare products from verified pharmacies.
              </p>
            </div>
            
            {/* Pay */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#14B8A6]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#14B8A6]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#14B8A6] to-[#0D9488] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#14B8A6]/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Pay</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Seamless payments with MTN MoMo, Airtel Money, or cash.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* DRIVERS SECTION */}
      {/* ============================================ */}
      <section id="drivers" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1A1A1F] rounded-3xl p-8 md:p-12 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00FF88]/10 to-[#00FFF3]/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Become a Rider Partner
                </h2>
                <p className="text-white/70 text-lg mb-8 max-w-xl">
                  Join our network of riders and drivers. Earn on your own schedule with competitive rates and instant payouts.
                </p>
                
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                  <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Set Your Own Hours
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Weekly Payouts
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    In-App Support
                  </div>
                </div>
                
                <a 
                  href="https://play.google.com/store" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-[#00FF88]/30 transition-all duration-300 hover:scale-105"
                >
                  Apply Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
              
              <div className="flex-shrink-0">
                <div className="w-48 h-48 bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 rounded-3xl flex items-center justify-center border border-[#00FF88]/20">
                  <svg className="w-24 h-24 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
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
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00FF88] to-[#00FFF3] rounded-xl flex items-center justify-center shadow-lg shadow-[#00FF88]/20">
                  <svg className="w-6 h-6 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">Smart Ride</span>
              </div>
              <p className="text-white/50 max-w-md mb-6 leading-relaxed">
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
