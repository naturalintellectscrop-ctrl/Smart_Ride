'use client';

import React, { useState, Suspense } from 'react';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { AnimatedAuthBackground } from '@/components/auth/AnimatedAuthBackground';
import '@/styles/auth-animations.css';

// ============================================
// SMART RIDE - FORGOT PASSWORD PAGE
// ============================================
// Design matches the admin login/reset pages
// Premium glassmorphism with animated background
// ============================================

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok && !data.success) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedAuthBackground />

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8 animate-fade-up">
            <div className="logo-container inline-block mb-6">
              <Link href="/" className="inline-block">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden animate-float"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 255, 136, 0.4), 0 0 60px rgba(0, 255, 136, 0.2)',
                  }}
                >
                  <Image
                    src="/smartride-logo.jpeg"
                    alt="Smart Ride Logo"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    priority
                  />
                </div>
              </Link>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Forgot Password
            </h1>
            <p className="text-white/50 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00FF88]" />
              Reset your account password
              <Sparkles className="w-4 h-4 text-[#00FF88]" />
            </p>
          </div>

          {/* Card with Glassmorphism */}
          <div className="glass-card rounded-3xl p-8 neon-border animate-fade-up delay-200 gpu-accelerated">
            <div className="relative z-10">
              {success ? (
                /* Success State */
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00FF88]/20 rounded-full mb-6 animate-pulse">
                    <CheckCircle2 className="w-8 h-8 text-[#00FF88]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Check Your Email</h2>
                  <p className="text-white/50 text-sm mb-4">
                    If an account with that email exists, a password reset link has been sent.
                  </p>
                  <p className="text-white/30 text-xs mb-6">
                    The link will expire in 1 hour.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[#00FF88] hover:text-[#00FFF3] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              ) : (
                /* Forgot Password Form */
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 rounded-xl mb-4 animate-pulse">
                      <Mail className="w-7 h-7 text-[#00FF88]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                    <p className="text-white/50 text-sm mt-1">
                      Enter your email to receive a reset link
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error Alert */}
                    {error && (
                      <div className="flex items-center gap-3 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl animate-fade-up">
                        <AlertCircle className="h-5 w-5 text-[#F43F5E] flex-shrink-0" />
                        <p className="text-[#F43F5E] text-sm">{error}</p>
                      </div>
                    )}

                    {/* Email Field */}
                    <div className="space-y-2 animate-fade-up delay-300">
                      <label className="block text-sm font-medium text-white/70">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-12 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                          disabled={isLoading}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 gradient-btn text-[#0D0D12] font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed animate-fade-up delay-600"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 animate-fade-up delay-900">
            <Link
              href="/"
              className="text-white/30 text-sm hover:text-[#00FF88] transition-colors duration-200 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>

          <p className="text-center text-white/20 text-xs mt-4 animate-fade-up delay-1000">
            Smart Ride
          </p>
        </div>
      </div>

      {/* Decorative corner elements */}
      <div className="fixed top-8 left-8 w-32 h-32 border-l-2 border-t-2 border-[#00FF88]/20 rounded-tl-3xl pointer-events-none z-0" />
      <div className="fixed bottom-8 right-8 w-32 h-32 border-r-2 border-b-2 border-[#00FFF3]/20 rounded-br-3xl pointer-events-none z-0" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#00FF88] animate-spin" />
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
