'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ADMIN_DASHBOARD_CONFIG } from '@/lib/config/admin-access';
import { AnimatedAuthBackground } from '@/components/auth/AnimatedAuthBackground';
import '@/styles/auth-animations.css';

// ============================================
// SMART RIDE - ADMIN LOGIN PAGE
// ============================================
// Design System:
// Primary: #00FF88 (neon green)
// Secondary: #00FFF3 (cyan)
// Background: #0D0D12 (dark)
// Accent gradient: linear-gradient(135deg, #00FF88 → #00FFF3)
// ============================================

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store admin token (using consistent key name)
      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('accessToken', data.accessToken); // Backward compatibility
      localStorage.setItem('refreshToken', data.refreshToken || '');
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      // Redirect to admin dashboard
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok && !data.success) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError('');
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
              {ADMIN_DASHBOARD_CONFIG.loginTitle}
            </h1>
            <p className="text-white/50 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00FF88]" />
              Internal administrative access only
              <Sparkles className="w-4 h-4 text-[#00FF88]" />
            </p>
          </div>

          {/* Login Card with Glassmorphism */}
          <div className="glass-card rounded-3xl p-8 neon-border animate-fade-up delay-200 gpu-accelerated">
            {/* Inner content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 rounded-xl mb-4 animate-pulse">
                  <Shield className="w-7 h-7 text-[#00FF88]" />
                </div>
                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                <p className="text-white/50 text-sm mt-1">
                  Enter your credentials to continue
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
                      placeholder="admin@smartride.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2 animate-fade-up delay-400">
                  <label className="block text-sm font-medium text-white/70">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#00FF88] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="text-right animate-fade-up delay-500">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotPassword(true);
                    }}
                    className="text-sm text-[#00FF88] hover:text-[#00FFF3] transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
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
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6 animate-fade-up delay-700">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1A1A1F] px-3 text-white/30">Secure Access</span>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-[#252530]/50 rounded-xl p-4 border border-white/5 animate-fade-up delay-800">
                <p className="text-xs text-white/40 text-center leading-relaxed">
                  This is a secure administrative interface. All actions are logged and monitored.
                  Unauthorized access attempts will be reported.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 animate-fade-up delay-900">
            <Link 
              href="/" 
              className="text-white/30 text-sm hover:text-[#00FF88] transition-colors duration-200"
            >
              ← Back to Smart Ride
            </Link>
          </div>
          
          <p className="text-center text-white/20 text-xs mt-4 animate-fade-up delay-1000">
            Smart Ride Administration • Internal Use Only
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeForgotPassword}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md glass-card rounded-3xl p-8 neon-border animate-fade-up">
            {/* Close Button */}
            <button
              onClick={closeForgotPassword}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {forgotSuccess ? (
              /* Success State */
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00FF88]/20 rounded-full mb-6">
                  <CheckCircle2 className="w-8 h-8 text-[#00FF88]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Check Your Email</h3>
                <p className="text-white/50 text-sm mb-4">
                  If an admin account with that email exists, a password reset link has been sent.
                </p>
                <p className="text-white/30 text-xs mb-6">
                  The link will expire in 1 hour.
                </p>
                <button
                  onClick={closeForgotPassword}
                  className="gradient-btn text-[#0D0D12] font-semibold rounded-xl px-8 py-3"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              /* Forgot Password Form */
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 rounded-xl mb-4">
                    <Mail className="w-7 h-7 text-[#00FF88]" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Forgot Password?</h3>
                  <p className="text-white/50 text-sm mt-1">
                    Enter your admin email to receive a reset link
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  {/* Error Alert */}
                  {forgotError && (
                    <div className="flex items-center gap-3 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-[#F43F5E] flex-shrink-0" />
                      <p className="text-[#F43F5E] text-sm">{forgotError}</p>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Admin Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                      <Input
                        type="email"
                        placeholder="admin@smartride.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-12 h-12 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                        disabled={forgotLoading}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full h-12 gradient-btn text-[#0D0D12] font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  {/* Back link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      className="text-white/30 text-sm hover:text-[#00FF88] transition-colors inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Decorative corner elements */}
      <div className="fixed top-8 left-8 w-32 h-32 border-l-2 border-t-2 border-[#00FF88]/20 rounded-tl-3xl pointer-events-none z-0" />
      <div className="fixed bottom-8 right-8 w-32 h-32 border-r-2 border-b-2 border-[#00FFF3]/20 rounded-br-3xl pointer-events-none z-0" />
    </div>
  );
}
