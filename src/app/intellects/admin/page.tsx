'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ADMIN_DASHBOARD_CONFIG } from '@/lib/config/admin-access';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken || '');
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      router.push('/intellects');
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
    <>
      <AuthShell
        title={ADMIN_DASHBOARD_CONFIG.loginTitle}
        subtitle="Internal administrative access only"
        footerNote="Smart Ride Administration - Internal use only"
      >
        <div className="mb-5 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#00D97E]" />
          <p className="text-sm text-white/50">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <AuthField
            id="email"
            label="Email"
            icon={Mail}
            type="email"
            placeholder="admin@smartride.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <AuthField
            id="password"
            label="Password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/35 transition-colors hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setShowForgotPassword(true);
              }}
              className="text-sm text-[#00D97E] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3.5 text-center text-xs leading-relaxed text-white/40">
          This is a secure administrative interface. All actions are logged and monitored.
          Unauthorized access attempts will be reported.
        </p>
      </AuthShell>

      <Dialog open={showForgotPassword} onOpenChange={(open) => !open && closeForgotPassword()}>
        <DialogContent className="border-white/10 bg-[#111214] text-white sm:max-w-sm">
          {forgotSuccess ? (
            <div className="py-2 text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#00D97E]/10">
                <CheckCircle2 className="h-6 w-6 text-[#00D97E]" />
              </div>
              <h3 className="text-lg font-semibold text-white">Check your email</h3>
              <p className="mt-2 text-sm text-white/50">
                If an admin account with that email exists, a reset link has been sent.
              </p>
              <p className="mt-1 text-xs text-white/30">The link expires in 1 hour.</p>
              <button
                onClick={closeForgotPassword}
                className="mt-5 h-10 w-full rounded-lg bg-white font-semibold text-[#0B0C0E] transition-opacity hover:opacity-90"
              >
                Back to login
              </button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Forgot password?</DialogTitle>
                <p className="text-sm text-white/50">Enter your admin email to receive a reset link.</p>
              </DialogHeader>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{forgotError}</p>
                  </div>
                )}

                <AuthField
                  id="forgot-email"
                  label="Admin email"
                  icon={Mail}
                  type="email"
                  placeholder="admin@smartride.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
