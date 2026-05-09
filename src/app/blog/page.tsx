'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../../components/landing/Navigation';
import Footer from '../../components/landing/Footer';

// ============================================
// BLOG POST DATA
// ============================================
const blogPosts = [
  {
    id: 1,
    slug: 'smart-ride-launches-in-kampala',
    title: 'Smart Ride Launches in Kampala: A New Era of Urban Mobility',
    excerpt: 'We are excited to announce the official launch of Smart Ride in Kampala, bringing affordable and reliable transportation to Uganda\'s bustling capital.',
    category: 'Company News',
    date: 'April 15, 2026',
    readTime: '3 min read',
    featured: true,
    gradient: 'linear-gradient(135deg, #00FF88, #00FFF3)',
  },
  {
    id: 2,
    slug: 'how-to-use-smart-ride-for-deliveries',
    title: 'How to Use Smart Ride for Fast & Reliable Deliveries',
    excerpt: 'Learn how to send packages, documents, and parcels across the city with our easy-to-use item delivery service.',
    category: 'How-To Guide',
    date: 'April 12, 2026',
    readTime: '5 min read',
    gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
  },
  {
    id: 3,
    slug: 'driver-safety-tips',
    title: 'Top Safety Tips for Smart Ride Drivers',
    excerpt: 'Safety is our priority. Here are essential tips for drivers to ensure safe rides and deliveries for everyone.',
    category: 'Safety',
    date: 'April 10, 2026',
    readTime: '4 min read',
    gradient: 'linear-gradient(135deg, #EF4444, #F97316)',
  },
  {
    id: 4,
    slug: 'smart-health-partnership',
    title: 'Smart Ride Partners with Local Pharmacies for Health Deliveries',
    excerpt: 'Our new Smart Health service brings medicine and health products right to your doorstep through trusted pharmacy partners.',
    category: 'Partnerships',
    date: 'April 8, 2026',
    readTime: '3 min read',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
  },
  {
    id: 5,
    slug: 'earn-with-smart-ride',
    title: 'Earn on Your Own Schedule: Becoming a Smart Ride Driver',
    excerpt: 'Join thousands of Ugandans earning flexible income by providing rides and deliveries with Smart Ride.',
    category: 'Careers',
    date: 'April 5, 2026',
    readTime: '4 min read',
    gradient: 'linear-gradient(135deg, #A855F7, #EC4899)',
  },
  {
    id: 6,
    slug: 'mobile-money-payments',
    title: 'Paying with MTN MoMo and Airtel Money on Smart Ride',
    excerpt: 'A complete guide to using mobile money for seamless, cashless payments on all Smart Ride services.',
    category: 'How-To Guide',
    date: 'April 2, 2026',
    readTime: '3 min read',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
];

const categories = ['All', 'Company News', 'How-To Guide', 'Safety', 'Partnerships', 'Careers'];

// ============================================
// PREMIUM BLOG CARD COMPONENT
// ============================================
const BlogCard = ({ post, isFeatured = false }: { post: typeof blogPosts[0]; isFeatured?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const primaryColor = post.gradient.match(/#[A-Fa-f0-9]{6}/g)?.[0] || '#00FF88';
  
  return (
    <article 
      className={`group relative overflow-hidden transition-all duration-700 cursor-pointer ${
        isFeatured 
          ? 'rounded-[2.5rem]' 
          : 'rounded-3xl border border-white/5'
      }`}
      style={{ 
        backgroundColor: isFeatured ? 'transparent' : '#1A1A1F',
        transform: isHovered && !isFeatured ? 'translateY(-10px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered && !isFeatured 
          ? `0 30px 60px -15px rgba(0,0,0,0.5), 0 0 40px ${primaryColor}15`
          : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isFeatured ? (
        <div 
          className="relative border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-700"
          style={{ 
            backgroundColor: '#1A1A1F',
            boxShadow: isHovered 
              ? `0 40px 80px -20px rgba(0,0,0,0.5), 0 0 60px ${primaryColor}20`
              : 'none'
          }}
        >
          <div className="flex flex-col lg:flex-row">
            {/* Featured Image Placeholder */}
            <div className="lg:w-1/2 h-72 lg:h-[450px] relative overflow-hidden">
              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${primaryColor}15, transparent)` }}
              >
                <div className="text-center">
                  <div 
                    className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                    style={{ 
                      background: post.gradient,
                      boxShadow: `0 20px 60px ${primaryColor}40`
                    }}
                  >
                    <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-white/40 text-base">Featured Article</span>
                </div>
              </div>
              {/* Category Badge */}
              <div className="absolute top-8 left-8">
                <span 
                  className="px-5 py-2.5 rounded-full text-sm font-bold backdrop-blur-md"
                  style={{ 
                    backgroundColor: 'rgba(13, 13, 18, 0.9)', 
                    color: primaryColor,
                    border: `1px solid ${primaryColor}40`,
                    boxShadow: `0 0 20px ${primaryColor}20`
                  }}
                >
                  {post.category}
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-5 text-base text-white/50">
                <span>{post.date}</span>
                <span className="w-1 h-1 rounded-full bg-white/30"></span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-5 transition-colors duration-300 group-hover:text-[#00FF88] leading-tight">
                {post.title}
              </h2>
              <p className="text-white/50 text-lg mb-8 leading-relaxed">{post.excerpt}</p>
              <Link 
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-3 font-bold text-lg transition-all duration-300 group-hover:gap-5"
                style={{ color: primaryColor }}
              >
                Read Full Article
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Card Image Placeholder */}
          <div className="h-56 relative overflow-hidden">
            <div 
              className="absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${primaryColor}10, transparent)` }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <svg className="w-8 h-8" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            {/* Category Badge */}
            <div className="absolute top-5 left-5">
              <span 
                className="px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md"
                style={{ 
                  backgroundColor: 'rgba(13, 13, 18, 0.9)', 
                  color: primaryColor
                }}
              >
                {post.category}
              </span>
            </div>
            
            {/* Neon Border Top */}
            <div 
              className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500"
              style={{ 
                background: post.gradient,
                opacity: isHovered ? 1 : 0.4,
                boxShadow: isHovered ? `0 0 20px ${primaryColor}` : 'none'
              }}
            />
          </div>
          
          {/* Content */}
          <div className="p-7">
            <div className="flex items-center gap-3 mb-4 text-sm text-white/40">
              <span>{post.date}</span>
              <span className="w-1 h-1 rounded-full bg-white/30"></span>
              <span>{post.readTime}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4 transition-colors duration-300 group-hover:text-[#00FF88] line-clamp-2 leading-snug">
              {post.title}
            </h3>
            <p className="text-white/50 text-base mb-6 line-clamp-2 leading-relaxed">{post.excerpt}</p>
            <Link 
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-2 font-semibold text-base transition-all duration-300 group-hover:gap-4"
              style={{ color: primaryColor }}
            >
              Read More
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </article>
  );
};

// ============================================
// MAIN BLOG PAGE COMPONENT
// ============================================
export default function BlogPage() {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    setMounted(true);
  }, []);

  const featuredPost = blogPosts.find(post => post.featured);
  const filteredPosts = blogPosts.filter(post => {
    if (activeCategory === 'All') return !post.featured;
    return post.category === activeCategory && !post.featured;
  });

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#0D0D12' }}>
      <Navigation currentPage="blog" />

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative pt-32 pb-20 px-6 lg:px-12 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-0 right-1/3 w-[700px] h-[700px] rounded-full opacity-20 blur-[120px] animate-pulse"
            style={{ background: 'radial-gradient(circle, #00FF88 0%, transparent 60%)' }}
          />
          <div 
            className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #00FFF3 0%, transparent 60%)' }}
          />
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{ 
              backgroundImage: 'linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)'
            }}
          />
        </div>

        <div className={`relative max-w-7xl mx-auto text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-10 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'rgba(0, 255, 136, 0.08)', 
              border: '1px solid rgba(0, 255, 136, 0.2)',
              boxShadow: '0 0 30px rgba(0,255,136,0.1)'
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="#00FF88" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-sm font-semibold tracking-wide" style={{ color: '#00FF88' }}>Smart Ride Insights</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
            Smart Ride{' '}
            <span 
              className="relative"
              style={{ 
                background: 'linear-gradient(135deg, #00FF88, #00FFF3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Blog
            </span>
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
            Latest news, tips, and updates from Uganda&apos;s leading ride and delivery platform. Stay informed about new features, safety tips, and community stories.
          </p>
          
          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className="px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                style={{ 
                  backgroundColor: activeCategory === category ? '#00FF88' : 'rgba(255,255,255,0.03)',
                  color: activeCategory === category ? '#0D0D12' : 'rgba(255,255,255,0.6)',
                  border: activeCategory === category ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: activeCategory === category ? '0 10px 40px rgba(0,255,136,0.3)' : 'none'
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURED POST */}
      {/* ============================================ */}
      {featuredPost && activeCategory === 'All' && (
        <section className="pb-16 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <BlogCard post={featuredPost} isFeatured={true} />
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* BLOG GRID */}
      {/* ============================================ */}
      <section className="py-16 px-6 lg:px-12" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-white">
              {activeCategory === 'All' ? 'Latest Articles' : activeCategory}
            </h2>
            <p className="text-white/40 text-lg">{filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}</p>
          </div>
          
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div 
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{ 
                  backgroundColor: 'rgba(0, 255, 136, 0.1)',
                  boxShadow: '0 0 40px rgba(0,255,136,0.2)'
                }}
              >
                <svg className="w-10 h-10" fill="none" stroke="#00FF88" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-white/50 text-xl">No articles found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================ */}
      {/* NEWSLETTER SECTION */}
      {/* ============================================ */}
      <section className="py-28 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div 
            className="relative rounded-[2.5rem] p-12 lg:p-16 text-center border border-white/5 overflow-hidden"
            style={{ backgroundColor: 'rgba(26, 26, 34, 0.5)' }}
          >
            {/* Background Gradients */}
            <div 
              className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] opacity-20"
              style={{ background: 'radial-gradient(circle, #00FF88 0%, transparent 60%)' }}
            />
            <div 
              className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-15"
              style={{ background: 'radial-gradient(circle, #00FFF3 0%, transparent 60%)' }}
            />

            <div className="relative">
              <div 
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
                style={{ 
                  backgroundColor: 'rgba(0, 255, 136, 0.15)',
                  boxShadow: '0 0 40px rgba(0,255,136,0.3)'
                }}
              >
                <svg className="w-10 h-10" fill="none" stroke="#00FF88" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6">Stay Updated</h2>
              <p className="text-white/50 mb-10 max-w-xl mx-auto text-xl">
                Subscribe to our newsletter and be the first to know about new features, promotions, and community updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-6 py-5 rounded-2xl text-white text-lg placeholder-white/40 focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                />
                <button 
                  className="px-8 py-5 rounded-2xl font-bold text-lg transition-all duration-500 hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, #00FF88, #00FFF3)', 
                    color: '#0D0D12',
                    boxShadow: '0 10px 40px rgba(0,255,136,0.3)'
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
