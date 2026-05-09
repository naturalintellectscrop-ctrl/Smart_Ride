'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface NavigationProps {
  currentPage?: string;
}

export default function Navigation({ currentPage }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home', active: currentPage === 'home' },
    { href: '/about', label: 'About', active: currentPage === 'about' },
    { href: '/blog', label: 'Blog', active: currentPage === 'blog' },
    { href: '/help', label: 'Help', active: currentPage === 'help' },
    { href: '/contact', label: 'Contact', active: currentPage === 'contact' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'py-3 shadow-2xl' 
          : 'py-4'
      }`}
      style={{ 
        backgroundColor: scrolled ? 'rgba(13, 13, 18, 0.98)' : 'rgba(13, 13, 18, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(0, 255, 136, 0.1)' : 'none'
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #00FF88, #00FFF3)', filter: 'blur(8px)' }}
              />
              <Image 
                src="/logo.jpeg" 
                alt="Smart Ride" 
                width={44} 
                height={44} 
                className="relative rounded-xl transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="text-2xl font-bold text-white">
              Smart<span style={{ color: '#00FF88' }}>Ride</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-base font-medium transition-all duration-300 group"
                style={{ color: link.active ? '#00FF88' : 'rgba(255,255,255,0.7)' }}
              >
                {link.label}
                <span 
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
                    link.active ? 'w-8' : 'w-0 group-hover:w-6'
                  }`}
                  style={{ background: 'linear-gradient(90deg, #00FF88, #00FFF3)' }}
                />
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/about#drivers"
              className="text-base font-medium transition-colors duration-300 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Become a Rider
            </Link>
            <a 
              href="https://play.google.com/store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative group overflow-hidden px-6 py-3 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, #00FF88, #00FFF3)',
                color: '#0D0D12'
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                Get the App
              </span>
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #00FFF3, #00FF88)' }}
              />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl transition-colors duration-300"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ backgroundColor: 'rgba(13, 13, 18, 0.98)' }}
      >
        <div className="px-6 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-base font-medium transition-all duration-300"
              style={{ 
                color: link.active ? '#00FF88' : 'rgba(255,255,255,0.8)',
                backgroundColor: link.active ? 'rgba(0, 255, 136, 0.1)' : 'transparent'
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 space-y-3">
            <Link 
              href="/about#drivers"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center py-3 rounded-xl border transition-colors duration-300"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              Become a Rider
            </Link>
            <a 
              href="https://play.google.com/store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-center py-3 rounded-xl font-semibold"
              style={{ 
                background: 'linear-gradient(135deg, #00FF88, #00FFF3)',
                color: '#0D0D12'
              }}
            >
              Get the App
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
