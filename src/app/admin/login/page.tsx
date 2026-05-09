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
  Shield
} from 'lucide-react';
import { ADMIN_DASHBOARD_CONFIG } from '@/lib/config/admin-access';

// ============================================
// SMART RIDE - ADMIN LOGIN PAGE
// ============================================
// Design System:
// Primary: #00FF88 (neon green)
// Secondary: #00FFF3 (cyan)
// Background: #0D0D12 (dark)
// Accent gradient: linear-gradient(135deg, #00FF88 → #00FFF3)
// ============================================

/**
 * Admin Login Page
 * 
 * Separate authentication for admin dashboard.
 * Only accessible at /admin/login or admin.smartride.com
 * 
 * This is NOT available in the mobile app.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      // Call admin login API
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

  return (
    <div className="min-h-screen bg-[#0D0D12] font-['Inter',sans-serif] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF88] rounded-full blur-[128px] opacity-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFF3] rounded-full blur-[128px] opacity-10" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          {/* Logo */}
          <Link href="/" className="inline-block mb-6">
            <div 
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-lg overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3)' }}
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
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {ADMIN_DASHBOARD_CONFIG.loginTitle}
          </h1>
          <p className="text-white/50 text-sm">
            Internal administrative access only
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1A1A1F] rounded-3xl p-8 border border-white/5 relative overflow-hidden">
          {/* Inner Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00FF88]/10 to-[#00FFF3]/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00FF88]/10 rounded-xl mb-4">
                <Shield className="w-6 h-6 text-[#00FF88]" />
              </div>
              <h2 className="text-xl font-bold text-white">Sign In</h2>
              <p className="text-white/50 text-sm mt-1">
                Enter your administrator credentials
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-[#F43F5E] flex-shrink-0" />
                  <p className="text-[#F43F5E] text-sm">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <Input
                    type="email"
                    placeholder="admin@smartride.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-[#252530] border-white/5 text-white placeholder:text-white/30 rounded-xl focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-[#252530] border-white/5 text-white placeholder:text-white/30 rounded-xl focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all duration-200"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-[#00FF88] hover:text-[#00FFF3] transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-[#00FF88] to-[#00FFF3] text-[#0D0D12] font-semibold rounded-xl hover:shadow-xl hover:shadow-[#00FF88]/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1A1A1F] px-3 text-white/30">Secure Access</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-[#252530] rounded-xl p-4 border border-white/5">
              <p className="text-xs text-white/40 text-center leading-relaxed">
                This is a secure administrative interface. All actions are logged and monitored.
                Unauthorized access attempts will be reported.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="text-white/30 text-sm hover:text-[#00FF88] transition-colors duration-200"
          >
            ← Back to Smart Ride
          </Link>
        </div>
        
        <p className="text-center text-white/20 text-xs mt-4">
          Smart Ride Administration • Internal Use Only
        </p>
      </div>
    </div>
  );
}
