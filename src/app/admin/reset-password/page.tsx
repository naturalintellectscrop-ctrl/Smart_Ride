'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import {
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { AnimatedAuthBackground } from '@/components/auth/AnimatedAuthBackground';
import '@/styles/auth-animations.css';

// ============================================
// SMART RIDE - ADMIN RESET PASSWORD PAGE
// ============================================
// Design matches the admin login page
// Premium glassmorphism with animated background
// ============================================

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('No reset token found. Please request a new password reset link.');
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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
              Reset Password
            </h1>
            <p className="text-white/50 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00FF88]" />
              Create a new admin password
              <Sparkles className="w-4 h-4 text-[#00FF88]" />
            </p>
          </div>

          {/* Reset Card with Glassmorphism */}
          <div className="glass-card rounded-3xl p-8 neon-border animate-fade-up delay-200 gpu-accelerated">
            <div className="relative z-10">
              {success ? (
                /* Success State */
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00FF88]/20 rounded-full mb-6 animate-pulse">
                    <CheckCircle2 className="w-8 h-8 text-[#00FF88]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Password Reset!</h2>
                  <p className="text-white/50 text-sm mb-6">
                    Your password has been reset successfully. Redirecting to login...
                  </p>
                  <Link
                    href="/admin/login"
                    className="inline-flex items-center gap-2 text-[#00FF88] hover:text-[#00FFF3] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go to Login
                  </Link>
                </div>
              ) : tokenValid === false ? (
                /* Invalid Token State */
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F43F5E]/20 rounded-full mb-6">
                    <AlertCircle className="w-8 h-8 text-[#F43F5E]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Invalid Link</h2>
                  <p className="text-white/50 text-sm mb-6">{error}</p>
                  <Link
                    href="/admin/login"
                    className="inline-flex items-center gap-2 text-[#00FF88] hover:text-[#00FFF3] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              ) : (
                /* Reset Form */
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#00FF88]/20 to-[#00FFF3]/20 rounded-xl mb-4 animate-pulse">
                      <Shield className="w-7 h-7 text-[#00FF88]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">New Password</h2>
                    <p className="text-white/50 text-sm mt-1">
                      Create a strong password for your admin account
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

                    {/* New Password Field */}
                    <div className="space-y-2 animate-fade-up delay-300">
                      <label className="block text-sm font-medium text-white/70">New Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 8 chars, 1 uppercase, 1 number"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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

                    {/* Confirm Password Field */}
                    <div className="space-y-2 animate-fade-up delay-400">
                      <label className="block text-sm font-medium text-white/70">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Re-enter your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-12 pr-12 h-12 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#00FF88] transition-colors"
                        >
                          {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-[#252530]/50 rounded-xl p-4 border border-white/5 animate-fade-up delay-500">
                      <p className="text-xs text-white/40 mb-2 font-medium">Password requirements:</p>
                      <ul className="space-y-1">
                        {[
                          { label: 'At least 8 characters', met: newPassword.length >= 8 },
                          { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
                          { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
                          { label: 'One number', met: /[0-9]/.test(newPassword) },
                          { label: 'Passwords match', met: confirmPassword.length > 0 && newPassword === confirmPassword },
                        ].map((req) => (
                          <li key={req.label} className="flex items-center gap-2 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full ${req.met ? 'bg-[#00FF88]' : 'bg-white/20'}`} />
                            <span className={req.met ? 'text-[#00FF88]/70' : 'text-white/30'}>{req.label}</span>
                          </li>
                        ))}
                      </ul>
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
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
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
              href="/admin/login"
              className="text-white/30 text-sm hover:text-[#00FF88] transition-colors duration-200 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>

          <p className="text-center text-white/20 text-xs mt-4 animate-fade-up delay-1000">
            Smart Ride Administration &bull; Internal Use Only
          </p>
        </div>
      </div>

      {/* Decorative corner elements */}
      <div className="fixed top-8 left-8 w-32 h-32 border-l-2 border-t-2 border-[#00FF88]/20 rounded-tl-3xl pointer-events-none z-0" />
      <div className="fixed bottom-8 right-8 w-32 h-32 border-r-2 border-b-2 border-[#00FFF3]/20 rounded-br-3xl pointer-events-none z-0" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#00FF88] animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
