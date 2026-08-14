'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import { WheelSpinner } from '@/components/auth/loaders/WheelSpinner';
import { RideLoader } from '@/components/auth/loaders/RideLoader';

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
      setTimeout(() => {
        router.push('/intellects/admin');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'Passwords match', met: confirmPassword.length > 0 && newPassword === confirmPassword },
  ];

  return (
    <AuthShell
      title="Reset password"
      subtitle="Create a new admin password"
      homeHref="/intellects/admin"
      footerNote="Smart Ride Administration - Internal use only"
    >
      {success ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#00D97E]/10">
            <CheckCircle2 className="h-6 w-6 text-[#00D97E]" />
          </div>
          <h2 className="text-lg font-semibold text-white">Password reset</h2>
          <p className="mt-2 text-sm text-white/50">
            Your password has been reset. Redirecting to login...
          </p>
          <Link
            href="/intellects/admin"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#00D97E] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to login
          </Link>
        </div>
      ) : tokenValid === false ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Invalid link</h2>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <Link
            href="/intellects/admin"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#00D97E] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <AuthField
            id="new-password"
            label="New password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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

          <AuthField
            id="confirm-password"
            label="Confirm password"
            icon={Lock}
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            trailing={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-white/35 transition-colors hover:text-white"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <ul className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-3.5">
            {requirements.map((req) => (
              <li key={req.label} className="flex items-center gap-2 text-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-[#00D97E]' : 'bg-white/20'}`} />
                <span className={req.met ? 'text-[#00D97E]/80' : 'text-white/40'}>{req.label}</span>
              </li>
            ))}
          </ul>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <WheelSpinner size={16} />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0B0C0E] text-[#00D97E]">
          <RideLoader variant="car" size={96} label="Loading" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
