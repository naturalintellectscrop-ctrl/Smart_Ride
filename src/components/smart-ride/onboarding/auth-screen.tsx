'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Phone, 
  Mail,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from '@/components/ui/input-otp';

interface AuthScreenProps {
  onBack: () => void;
  onAuthSuccess: (userData: { phone?: string; email?: string; name: string }) => void;
}

type AuthStep = 'phone' | 'otp' | 'success';

export function AuthScreen({ onBack, onAuthSuccess }: AuthScreenProps) {
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate OTP sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setAuthStep('otp');
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate OTP verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setAuthStep('success');
    
    // Auto-proceed after success animation
    setTimeout(() => {
      onAuthSuccess({ 
        phone, 
        name: `User ${phone.slice(-4)}` 
      });
    }, 1000);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    // Simulate Google login
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    onAuthSuccess({ 
      email: 'user@gmail.com', 
      name: 'Google User' 
    });
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 py-4 flex items-center border-b border-white/5">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="mr-2 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white">
          {authStep === 'phone' && 'Sign In'}
          {authStep === 'otp' && 'Verify OTP'}
          {authStep === 'success' && 'Success!'}
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 pt-8">
        {authStep === 'phone' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-[#00FF88]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Enter your phone number
              </h2>
              <p className="text-gray-400 text-sm">
                We'll send you a verification code
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                  +256
                </span>
                <Input
                  type="tel"
                  placeholder="7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="pl-16 h-14 text-base bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20"
                />
              </div>
              
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button 
                onClick={handlePhoneSubmit}
                disabled={isLoading || phone.length < 9}
                className="w-full h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] rounded-xl font-semibold text-base"
                style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.25)' }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Continue'
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-sm text-gray-500">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Social Login */}
            <div className="space-y-3">
              <Button 
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-14 rounded-xl font-medium bg-[#1A1A24] border-[#1A1A24] text-white hover:bg-[#1E1E28] hover:border-[#00FF88]/30"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button 
                variant="outline"
                disabled
                className="w-full h-14 rounded-xl font-medium bg-[#1A1A24] border-[#1A1A24] text-gray-500"
              >
                <Mail className="h-5 w-5 mr-2" />
                Continue with Apple (Coming Soon)
              </Button>
            </div>
          </>
        )}

        {authStep === 'otp' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-[#00FF88]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Verify your number
              </h2>
              <p className="text-gray-400 text-sm">
                Enter the code sent to +256 {phone}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={otp} 
                  onChange={setOtp}
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button 
                onClick={handleOtpSubmit}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] rounded-xl font-semibold"
                style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.25)' }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Verify'
                )}
              </Button>

              <p className="text-center text-sm text-gray-400">
                Didn't receive code?{' '}
                <button 
                  onClick={() => setAuthStep('phone')}
                  className="text-[#00FF88] font-medium"
                >
                  Resend
                </button>
              </p>
            </div>
          </>
        )}

        {authStep === 'success' && (
          <div className="text-center py-12">
            <div 
              className="w-20 h-20 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)' }}
            >
              <ShieldCheck className="h-10 w-10 text-[#00FF88]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Verification Complete!
            </h2>
            <p className="text-gray-400 text-sm">
              Setting up your account...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
