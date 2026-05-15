'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { 
  Mail, 
  Lock, 
  User,
  Phone,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { AnimatedAuthBackground } from '@/components/auth/AnimatedAuthBackground';
import '@/styles/auth-animations.css';

// ============================================
// SMART RIDE - USER SIGNUP PAGE
// ============================================
// Premium futuristic registration with
// animated particles and glassmorphism UI
// ============================================

export default function UserSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !phone || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to home or onboarding
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedAuthBackground />
      
      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-6 animate-fade-up">
            {/* Logo with breathing animation */}
            <div className="logo-container inline-block mb-4">
              <Link href="/" className="inline-block">
                <div 
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden animate-float"
                  style={{ 
                    boxShadow: '0 8px 40px rgba(0, 255, 136, 0.5), 0 0 80px rgba(0, 255, 136, 0.3)',
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
              Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#00FFF3]">Smart Ride</span>
            </h1>
            <p className="text-white/60 text-sm">
              Create your account and start riding
            </p>
          </div>

          {/* Signup Card with Glassmorphism */}
          <div className="glass-card rounded-3xl p-6 neon-border animate-fade-up delay-200 gpu-accelerated">
            {/* Inner content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-5">
                <h2 className="text-xl font-bold text-white">Create Account</h2>
                <p className="text-white/50 text-sm mt-1">
                  Fill in your details to get started
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <div className="flex items-center gap-3 p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl animate-fade-up">
                    <AlertCircle className="h-5 w-5 text-[#F43F5E] flex-shrink-0" />
                    <p className="text-[#F43F5E] text-sm">{error}</p>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-1.5 animate-fade-up delay-300">
                  <label className="block text-sm font-medium text-white/70">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-12 h-11 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5 animate-fade-up delay-400">
                  <label className="block text-sm font-medium text-white/70">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-11 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5 animate-fade-up delay-500">
                  <label className="block text-sm font-medium text-white/70">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                    <Input
                      type="tel"
                      placeholder="+256 7XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-12 h-11 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="grid grid-cols-2 gap-3 animate-fade-up delay-600">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-white/70">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300 text-sm"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-white/70">Confirm</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-[#00FF88] transition-colors" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-[#252530]/80 border-white/10 text-white placeholder:text-white/30 rounded-xl input-glow transition-all duration-300 text-sm"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#00FF88] transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 animate-fade-up delay-700">
                  <button
                    type="button"
                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                    className={`flex-shrink-0 w-5 h-5 rounded border transition-all duration-300 ${
                      agreedToTerms 
                        ? 'bg-[#00FF88] border-[#00FF88]' 
                        : 'border-white/20 hover:border-[#00FF88]/50'
                    }`}
                  >
                    {agreedToTerms && (
                      <CheckCircle2 className="w-full h-full text-[#0D0D12]" />
                    )}
                  </button>
                  <p className="text-white/50 text-xs leading-relaxed">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#00FF88] hover:text-[#00FFF3] transition-colors">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-[#00FF88] hover:text-[#00FFF3] transition-colors">
                      Privacy Policy
                    </Link>
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 gradient-btn text-[#0D0D12] font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed animate-fade-up delay-800 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5 animate-fade-up delay-900">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1A1A1F] px-3 text-white/30">Or sign up with</span>
                </div>
              </div>

              {/* Social Signup Options */}
              <div className="grid grid-cols-2 gap-3 animate-fade-up delay-1000">
                <button
                  type="button"
                  className="h-11 bg-[#252530]/50 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white/70 hover:bg-[#252530] hover:border-[#00FF88]/30 transition-all duration-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="h-11 bg-[#252530]/50 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white/70 hover:bg-[#252530] hover:border-[#00FF88]/30 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  Facebook
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center mt-5 animate-fade-up delay-1100">
                <p className="text-white/50 text-sm">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-[#00FF88] hover:text-[#00FFF3] font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corner elements */}
      <div className="fixed top-8 left-8 w-32 h-32 border-l-2 border-t-2 border-[#00FF88]/20 rounded-tl-3xl pointer-events-none z-0" />
      <div className="fixed bottom-8 right-8 w-32 h-32 border-r-2 border-b-2 border-[#00FFF3]/20 rounded-br-3xl pointer-events-none z-0" />
    </div>
  );
}
