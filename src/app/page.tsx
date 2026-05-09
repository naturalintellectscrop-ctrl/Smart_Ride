'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';

// ============================================
// SMART RIDE - PREMIUM LANDING PAGE
// ============================================
// Design System:
// Primary: #00FF88 (neon green)
// Secondary: #00FFF3 (cyan)
// Background: #0D0D12 (dark)
// Accent gradient: linear-gradient(135deg, #00FF88 → #00FFF3)
// ============================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D12] font-['Inter',sans-serif]">
      
      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D12]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo />
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">
                About
              </Link>
              <Link href="/help" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">
                Help
              </Link>
              <Link href="/contact" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">
                Contact
              </Link>
              <Link href="/blog" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">
                Blog
              </Link>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link 
                href="/admin/login" 
                className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium hidden sm:block"
              >
                Admin
              </Link>
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
        </div>
      </nav>

      {/* ============================================ */}
      {/* HERO SECTION - 100vh */}
      {/* ============================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Gradient Overlay */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
          }}
        />
        
        {/* Animated Glow Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF88] rounded-full blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFF3] rounded-full blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Content */}
        <div className="relative z-10 text-center px-4 pt-20">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight max-w-4xl mx-auto">
            Your All-in-One Mobility
            <span 
              className="block mt-2 bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
              }}
            >
              & Delivery App
            </span>
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Book rides, order food, get items delivered, and shop from local stores — all from one app. Fast, reliable, and affordable services across Uganda.
          </p>
          
          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://play.google.com/store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-[#00FF88]/40 transition-all duration-300 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v17c0 .83-.67 1.5-1.5 1.5S3 21.33 3 20.5zm11.25-8.5l4.72-4.72c.3-.3.3-.77 0-1.06l-4.72-4.72c-.3-.3-.77-.3-1.06 0L8.72 6.22c-.3.3-.3.77 0 1.06L13.25 12l-4.53 4.72c-.3.3-.3.77 0 1.06l4.72 4.72c.3.3.77.3 1.06 0l4.72-4.72c.3-.3.3-.77 0-1.06L14.25 12z"/>
              </svg>
              Get the App
            </a>
            <Link 
              href="/about#drivers"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#00FF88]/20 hover:border-[#00FF88]/50 transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Become a Rider
            </Link>
          </div>
          
          {/* Phone Mockup */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-transparent to-transparent z-10 pointer-events-none" />
            <div className="flex justify-center">
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-[#00FF88]/20 to-[#00FFF3]/20 rounded-[48px] blur-2xl" />
                
                {/* Phone Frame */}
                <div className="relative bg-[#1A1A1F] rounded-[32px] p-3 border border-white/10 shadow-2xl">
                  <div className="w-72 sm:w-80 h-[500px] sm:h-[560px] bg-gradient-to-b from-[#1A1A1F] to-[#0D0D12] rounded-[24px] flex flex-col items-center justify-center overflow-hidden">
                    {/* App Logo */}
                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg shadow-[#00FF88]/30 mb-6 overflow-hidden">
                      <Image
                        src="/smartride-logo.jpeg"
                        alt="Smart Ride Logo"
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                        priority
                      />
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-2">Smart Ride</h3>
                    <p className="text-white/50 text-sm mb-8">Uganda's #1 Mobility App</p>
                    
                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-2 justify-center px-4">
                      <span className="px-3 py-1.5 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full text-[#00FF88] text-xs font-medium">Rides</span>
                      <span className="px-3 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full text-[#F59E0B] text-xs font-medium">Food</span>
                      <span className="px-3 py-1.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full text-[#8B5CF6] text-xs font-medium">Shopping</span>
                      <span className="px-3 py-1.5 bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-full text-[#14B8A6] text-xs font-medium">Delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SERVICES SECTION */}
      {/* ============================================ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D0D12]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need,{' '}
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                }}
              >
                One App
              </span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              From daily commutes to food delivery, Smart Ride connects you with reliable services at your fingertips.
            </p>
          </div>
          
          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Smart Ride */}
            <div className="group bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#00FF88]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#00FF88] to-[#059669] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#00FF88]/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Ride</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Book a Boda Boda or Car ride in seconds. Safe, affordable, and reliable transportation across Uganda.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Smart Boda - From UGX 2,000
                </li>
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Smart Car - From UGX 5,000
                </li>
              </ul>
            </div>
            
            {/* Smart Food */}
            <div className="group bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#F59E0B]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#F59E0B]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#F59E0B]/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Food</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Order from your favorite restaurants. Fast delivery from local cafes and kitchens to your doorstep.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  100+ Local Restaurants
                </li>
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  30 Min Average Delivery
                </li>
              </ul>
            </div>
            
            {/* Smart Delivery */}
            <div className="group bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#3B82F6]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#3B82F6]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#3B82F6]/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Delivery</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Send packages, documents, or any items across town. Reliable pickup and drop-off service.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Package Delivery
                </li>
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Real-time Tracking
                </li>
              </ul>
            </div>
            
            {/* Smart Shopping */}
            <div className="group bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#8B5CF6]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#8B5CF6]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#8B5CF6]/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Shopping</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Shop groceries, pharmacy items, and more from local stores. Quality products delivered to you.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Groceries
                </li>
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Pharmacy Items
                </li>
              </ul>
            </div>
            
            {/* Smart Health */}
            <div className="group bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#F43F5E]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#F43F5E]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F43F5E] to-[#E11D48] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#F43F5E]/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Health</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Order medicines, book pharmacy deliveries, and access healthcare services from trusted providers.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#F43F5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Medicine Delivery
                </li>
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#F43F5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Pharmacy Partners
                </li>
              </ul>
            </div>
            
            {/* Smart Pay */}
            <div className="group bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#14B8A6]/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#14B8A6]/10">
              <div className="w-14 h-14 bg-gradient-to-br from-[#14B8A6] to-[#0D9488] rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-[#14B8A6]/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Pay</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Seamless payments with MTN MoMo, Airtel Money, or cash. Secure and instant transactions.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  MTN MoMo
                </li>
                <li className="flex items-center gap-2 text-white/50 text-sm">
                  <svg className="w-4 h-4 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Airtel Money
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS SECTION */}
      {/* ============================================ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Getting started is easy. Follow these simple steps to enjoy our services.
            </p>
          </div>
          
          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connection Line - Desktop Only */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-[#00FF88] to-[#00FFF3] rounded-full" />
            
            {/* Step 1 */}
            <div className="relative text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-[#0D0D12] shadow-lg relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                  boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3)',
                }}
              >
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Request</h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Open the app and request a ride, food order, or delivery service.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="relative text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-[#0D0D12] shadow-lg relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                  boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3)',
                }}
              >
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Match</h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                We connect you with the nearest available rider or driver.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="relative text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-[#0D0D12] shadow-lg relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                  boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3)',
                }}
              >
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ride</h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Track in real-time as your rider arrives and completes your request.
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="relative text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-[#0D0D12] shadow-lg relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                  boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3)',
                }}
              >
                4
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Pay</h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Pay seamlessly with MTN MoMo, Airtel Money, or cash. Rate your experience!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* DRIVER CTA SECTION */}
      {/* ============================================ */}
      <section 
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,255,243,0.1) 100%)',
        }}
      >
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF88] rounded-full blur-[128px] opacity-10" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="bg-[#1A1A1F] rounded-3xl p-8 md:p-12 border border-white/5 relative overflow-hidden">
            {/* Inner Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00FF88]/10 to-[#00FFF3]/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              {/* Content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                  Earn with Smart Ride
                </h2>
                <p className="text-white/70 text-lg mb-8 max-w-xl">
                  Join thousands of riders and drivers earning on their own schedule. Be your own boss, set your own hours, and earn money delivering rides, food, and packages.
                </p>
                
                {/* Benefits */}
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                  <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Flexible Hours
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Weekly Earnings
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    In-App Support
                  </div>
                </div>
                
                {/* CTA */}
                <a 
                  href="https://play.google.com/store" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-[#00FF88]/30 transition-all duration-300 hover:scale-105"
                >
                  Start Earning Today
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
              
              {/* Illustration */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 rounded-3xl flex items-center justify-center border border-[#00FF88]/20 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/5 to-[#00FFF3]/5 rounded-3xl" />
                  <svg className="w-24 h-24 text-[#00FF88] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PAYMENT METHODS */}
      {/* ============================================ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D0D12]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12">
            Accepted Payment Methods
          </h2>
          
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {/* MTN MoMo */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 flex items-center gap-4 hover:border-[#FFCC00]/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-[#FFCC00] rounded-xl flex items-center justify-center">
                <span className="text-[#0D0D12] font-bold text-sm">MTN</span>
              </div>
              <span className="text-white font-medium">MTN MoMo</span>
            </div>
            
            {/* Airtel Money */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 flex items-center gap-4 hover:border-[#ED1C24]/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-[#ED1C24] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-white font-medium">Airtel Money</span>
            </div>
            
            {/* Cash */}
            <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 flex items-center gap-4 hover:border-[#00FF88]/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-[#00FF88] to-[#00FFF3] rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-white font-medium">Cash</span>
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
            
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Logo />
              <p className="text-white/50 max-w-md mb-6 leading-relaxed mt-6">
                Uganda's premier mobility platform. Connecting riders, drivers, and businesses for seamless transportation and delivery services.
              </p>
              
              {/* Social Links */}
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-[#1A1A1F] rounded-xl flex items-center justify-center text-white/50 hover:text-[#00FF88] hover:bg-[#1A1A1F]/80 transition-all duration-200" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-[#1A1A1F] rounded-xl flex items-center justify-center text-white/50 hover:text-[#00FF88] hover:bg-[#1A1A1F]/80 transition-all duration-200" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-[#1A1A1F] rounded-xl flex items-center justify-center text-white/50 hover:text-[#00FF88] hover:bg-[#1A1A1F]/80 transition-all duration-200" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-6">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">About Us</Link></li>
                <li><Link href="/help" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Help Center</Link></li>
                <li><Link href="/contact" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Contact</Link></li>
                <li><Link href="/blog" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Blog</Link></li>
                <li><Link href="/admin/login" className="text-white/50 hover:text-[#00FF88] transition-colors duration-200">Admin Portal</Link></li>
              </ul>
            </div>
            
            {/* Contact */}
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
          
          {/* Bottom Bar */}
          <div className="border-t border-white/5 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/30 text-sm">
                © {new Date().getFullYear()} Smart Ride Uganda. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="text-white/30 hover:text-white transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="text-white/30 hover:text-white transition-colors duration-200">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
