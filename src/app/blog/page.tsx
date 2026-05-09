'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

// ============================================
// SMART RIDE - BLOG PAGE
// ============================================

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  image?: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: '5 Tips for a Safe Ride Experience',
    excerpt: 'Learn how to make the most of your Smart Ride experience with these essential safety tips for passengers.',
    date: 'Jan 15, 2026',
    category: 'Safety',
    readTime: '5 min read',
  },
  {
    id: '2',
    title: 'How to Become a Successful Driver Partner',
    excerpt: 'Discover the strategies our top-earning drivers use to maximize their earnings and maintain excellent ratings.',
    date: 'Jan 12, 2026',
    category: 'Drivers',
    readTime: '7 min read',
  },
  {
    id: '3',
    title: 'Smart Food: The Ultimate Guide',
    excerpt: 'Everything you need to know about ordering food through Smart Ride, from finding restaurants to tracking deliveries.',
    date: 'Jan 10, 2026',
    category: 'Food',
    readTime: '6 min read',
  },
  {
    id: '4',
    title: 'MTN MoMo Integration: Seamless Payments',
    excerpt: 'Learn how to set up and use MTN Mobile Money for quick and secure payments on Smart Ride.',
    date: 'Jan 8, 2026',
    category: 'Payments',
    readTime: '4 min read',
  },
  {
    id: '5',
    title: 'Smart Ride Expands to 10 New Cities',
    excerpt: 'We are excited to announce our expansion to 10 additional cities across Uganda, bringing our total coverage to over 50 locations.',
    date: 'Jan 5, 2026',
    category: 'News',
    readTime: '3 min read',
  },
  {
    id: '6',
    title: 'Behind the Scenes: Our Safety Technology',
    excerpt: 'Take a look at the technology and processes we use to ensure every ride on our platform is safe and secure.',
    date: 'Jan 3, 2026',
    category: 'Technology',
    readTime: '8 min read',
  },
];

const categoryColors: Record<string, string> = {
  Safety: '#00FF88',
  Drivers: '#F59E0B',
  Food: '#3B82F6',
  Payments: '#8B5CF6',
  News: '#14B8A6',
  Technology: '#F43F5E',
};

export default function BlogPage() {
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
              <Link href="/contact" className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium">Contact</Link>
              <Link href="/blog" className="text-[#00FF88] text-sm font-medium">Blog</Link>
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
              Smart Ride{' '}
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #00FF88 0%, #00FFF3 100%)',
                }}
              >
                Blog
              </span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Stay updated with the latest news, tips, and stories from the Smart Ride community.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURED POST */}
      {/* ============================================ */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1A1A1F] rounded-3xl overflow-hidden border border-white/5 hover:border-[#00FF88]/20 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image Placeholder */}
              <div className="h-64 lg:h-auto bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#00FF88] to-[#00FFF3] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00FF88]/20">
                    <svg className="w-10 h-10 text-[#0D0D12]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-white/50 text-sm">Featured Story</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 w-fit"
                  style={{
                    backgroundColor: `${categoryColors['News']}20`,
                    color: categoryColors['News'],
                  }}
                >
                  Featured
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Smart Ride Celebrates 1 Million Rides Milestone
                </h2>
                <p className="text-white/60 mb-6 leading-relaxed">
                  We are thrilled to announce that Smart Ride has completed over 1 million rides across Uganda! This incredible milestone wouldn't have been possible without our amazing community of riders, drivers, and partners.
                </p>
                <div className="flex items-center gap-4 text-white/40 text-sm mb-6">
                  <span>Jan 1, 2026</span>
                  <span>•</span>
                  <span>5 min read</span>
                </div>
                <a 
                  href="#" 
                  className="inline-flex items-center gap-2 text-[#00FF88] font-semibold hover:gap-3 transition-all duration-200"
                >
                  Read More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* BLOG GRID */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">
            Latest Articles
          </h2>
          
          {/* Grid: 3-col desktop, 2-col tablet, 1-col mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <article 
                key={post.id}
                className="bg-[#1A1A1F] rounded-2xl overflow-hidden border border-white/5 hover:border-[#00FF88]/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#00FF88]/10 group cursor-pointer"
              >
                {/* Card Image Placeholder */}
                <div 
                  className="h-48 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${categoryColors[post.category]}10 0%, ${categoryColors[post.category]}05 100%)`,
                    borderTop: `3px solid ${categoryColors[post.category]}`,
                  }}
                >
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${categoryColors[post.category]}20`,
                    }}
                  >
                    <svg className="w-8 h-8" style={{ color: categoryColors[post.category] }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                </div>
                
                {/* Card Content */}
                <div className="p-6">
                  <span 
                    className="inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-3"
                    style={{
                      backgroundColor: `${categoryColors[post.category]}15`,
                      color: categoryColors[post.category],
                    }}
                  >
                    {post.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#00FF88] transition-colors duration-200">
                    {post.title}
                  </h3>
                  <p className="text-white/50 text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-white/30 text-xs">
                    <span>{post.date}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          
          {/* Load More */}
          <div className="mt-12 text-center">
            <button className="bg-[#1A1A1F] border border-white/10 text-white px-8 py-3 rounded-xl font-semibold hover:border-[#00FF88]/30 hover:bg-[#1A1A1F]/80 transition-all duration-300">
              Load More Articles
            </button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* NEWSLETTER SECTION */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0A0A0F]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-white/60 mb-8">
            Get the latest updates, tips, and exclusive offers delivered to your inbox.
          </p>
          
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-[#1A1A1F] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] px-6 py-3.5 rounded-xl font-semibold hover:shadow-xl hover:shadow-[#00FF88]/30 transition-all duration-300 whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
          
          <p className="text-white/30 text-xs mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
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
