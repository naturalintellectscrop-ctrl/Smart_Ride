'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

// ============================================
// SMART RIDE - CONTACT PAGE
// ============================================

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
    
    // Reset success message after 5 seconds
    setTimeout(() => setSubmitted(false), 5000);
  };

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
              <Link href="/help" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Help</Link>
              <Link href="/contact" className="text-[#00FF88] text-sm font-medium">Contact</Link>
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
              Get in{' '}
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                }}
              >
                Touch
              </span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Have questions or need assistance? We're here to help. Reach out to us and we'll respond as soon as we can.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CONTACT CONTENT */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Contact Form */}
            <div className="bg-[#1A1A1F] rounded-3xl p-8 border border-white/5">
              <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
              
              {submitted ? (
                <div className="bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-[#00FF88] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                  <p className="text-white/60">Thank you for reaching out. We'll get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-white font-medium mb-2 text-sm">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full bg-[#252530] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200"
                      placeholder="Enter your name"
                    />
                  </div>
                  
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-white font-medium mb-2 text-sm">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full bg-[#252530] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200"
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  {/* Subject Field */}
                  <div>
                    <label htmlFor="subject" className="block text-white font-medium mb-2 text-sm">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="w-full bg-[#252530] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200"
                      placeholder="What is this about?"
                    />
                  </div>
                  
                  {/* Message Field */}
                  <div>
                    <label htmlFor="message" className="block text-white font-medium mb-2 text-sm">
                      Message
                    </label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      className="w-full bg-[#252530] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200 resize-none"
                      placeholder="Tell us more..."
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-[#00FF88]/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
            
            {/* Contact Info */}
            <div className="space-y-8">
              {/* Contact Cards */}
              <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/20 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#00FF88]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email Us</h3>
                    <p className="text-white/50 text-sm mb-2">For general inquiries and support</p>
                    <a href="mailto:support@smartride.ug" className="text-[#00FF88] hover:underline">
                      support@smartride.ug
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/20 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#00FF88]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Call Us</h3>
                    <p className="text-white/50 text-sm mb-2">Mon-Fri from 8am to 6pm</p>
                    <a href="tel:+256700123456" className="text-[#00FF88] hover:underline">
                      +256 700 123 456
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/20 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#00FF88]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Visit Us</h3>
                    <p className="text-white/50 text-sm mb-2">Our headquarters</p>
                    <p className="text-white/70">
                      Kampala, Uganda<br />
                      Plot 123, Jinja Road
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/20 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#00FF88]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">In-App Support</h3>
                    <p className="text-white/50 text-sm mb-2">Get help directly in the app</p>
                    <p className="text-white/70">
                      Open the Smart Ride app and tap on Help in the menu
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Social Links */}
              <div className="bg-[#1A1A1F] rounded-2xl p-6 border border-white/5">
                <h3 className="text-white font-semibold mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-12 h-12 bg-[#252530] rounded-xl flex items-center justify-center text-white/50 hover:text-[#00FF88] hover:bg-[#00FF88]/10 transition-all duration-200" aria-label="Facebook">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-12 h-12 bg-[#252530] rounded-xl flex items-center justify-center text-white/50 hover:text-[#00FF88] hover:bg-[#00FF88]/10 transition-all duration-200" aria-label="Twitter">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-12 h-12 bg-[#252530] rounded-xl flex items-center justify-center text-white/50 hover:text-[#00FF88] hover:bg-[#00FF88]/10 transition-all duration-200" aria-label="Instagram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </a>
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
