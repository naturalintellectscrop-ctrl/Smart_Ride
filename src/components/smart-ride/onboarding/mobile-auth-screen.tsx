/**
 * Smart Ride Mobile Authentication Screen
 * 
 * Authentication options:
 * - Phone number with OTP (primary) - Firebase Phone Auth
 * - Google Sign-In (optional)
 * 
 * Both methods are secure and user-friendly.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Loader2,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Phone as PhoneIcon
} from 'lucide-react';
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from '@/components/ui/input-otp';
import { 
  signInWithGoogle, 
  handleGoogleRedirectResult,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  initRecaptchaVerifier,
  GoogleSignInResult,
  PhoneSignInResult,
  PhoneVerifyResult
} from '@/lib/firebase/firebase-service';
import { 
  ConfirmationResult,
  ApplicationVerifier 
} from 'firebase/auth';

interface MobileAuthScreenProps {
  onBack: () => void;
  onAuthSuccess: (userData: { phone?: string; name: string; email?: string; photoURL?: string; uid?: string; idToken?: string }) => void;
}

type AuthStep = 'phone' | 'otp' | 'success';

/**
 * Mobile Authentication Screen
 * 
 * Supports phone number OTP and Google Sign-In
 */
export function MobileAuthScreen({ onBack, onAuthSuccess }: MobileAuthScreenProps) {
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<ApplicationVerifier | null>(null);
  const recaptchaButtonRef = useRef<HTMLButtonElement>(null);

  // Timer for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle Google redirect result on mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      const result = await handleGoogleRedirectResult();
      if (result?.success && result.user) {
        onAuthSuccess({
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          phone: result.user.phoneNumber,
          uid: result.user.uid,
          idToken: result.user.idToken,
        });
      }
    };

    checkRedirectResult();
  }, [onAuthSuccess]);

  // Initialize reCAPTCHA verifier when component mounts
  useEffect(() => {
    if (recaptchaButtonRef.current && !recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = initRecaptchaVerifier('recaptcha-button');
    }
  }, []);

  const handlePhoneSubmit = async () => {
    if (phone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      // Initialize reCAPTCHA if not already done
      if (!recaptchaVerifierRef.current && recaptchaButtonRef.current) {
        recaptchaVerifierRef.current = initRecaptchaVerifier('recaptcha-button');
      }

      if (!recaptchaVerifierRef.current) {
        setError('Unable to initialize verification. Please refresh and try again.');
        setIsLoading(false);
        return;
      }

      // Format phone number with country code
      const fullPhoneNumber = `+256${phone}`;
      
      // Send verification code via Firebase
      const result: PhoneSignInResult = await sendPhoneVerificationCode(
        fullPhoneNumber,
        recaptchaVerifierRef.current
      );

      if (result.success && result.confirmationResult) {
        setConfirmationResult(result.confirmationResult);
        setAuthStep('otp');
        setResendTimer(60); // 60 second cooldown
      } else {
        setError(result.error || 'Unable to send verification code');
        // Reset reCAPTCHA on failure
        recaptchaVerifierRef.current = null;
      }
    } catch (err) {
      console.error('Phone submit error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setError('');
    setIsLoading(true);

    try {
      // Reset reCAPTCHA
      recaptchaVerifierRef.current = null;
      if (recaptchaButtonRef.current) {
        recaptchaVerifierRef.current = initRecaptchaVerifier('recaptcha-button');
      }

      if (!recaptchaVerifierRef.current) {
        setError('Unable to initialize verification. Please try again.');
        setIsLoading(false);
        return;
      }

      const fullPhoneNumber = `+256${phone}`;
      const result: PhoneSignInResult = await sendPhoneVerificationCode(
        fullPhoneNumber,
        recaptchaVerifierRef.current
      );

      if (result.success && result.confirmationResult) {
        setConfirmationResult(result.confirmationResult);
        setResendTimer(60);
        setError('');
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    
    if (!confirmationResult) {
      setError('Verification session expired. Please go back and try again.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      const result: PhoneVerifyResult = await verifyPhoneCode(confirmationResult, otp);

      if (result.success && result.user) {
        setAuthStep('success');
        
        // Auto-proceed after success animation
        setTimeout(() => {
          onAuthSuccess({ 
            phone: result.user!.phoneNumber, 
            name: `User ${phone.slice(-4)}`,
            uid: result.user!.uid,
            idToken: result.user!.idToken,
          });
        }, 1000);
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const result: GoogleSignInResult = await signInWithGoogle();

      if (result.success && result.user) {
        setAuthStep('success');
        setTimeout(() => {
          onAuthSuccess({
            name: result.user!.displayName,
            email: result.user!.email,
            photoURL: result.user!.photoURL,
            phone: result.user!.phoneNumber,
            uid: result.user!.uid,
            idToken: result.user!.idToken,
          });
        }, 1000);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Hidden reCAPTCHA button */}
      <button 
        ref={recaptchaButtonRef} 
        id="recaptcha-button"
        className="hidden"
        aria-hidden="true"
      />
      
      {/* Header */}
      <div className="px-4 py-4 flex items-center border-b border-white/5">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => authStep === 'otp' ? setAuthStep('phone') : onBack()}
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
            {/* Phone Icon */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-[#00FF88]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Welcome to Smart Ride
              </h2>
              <p className="text-gray-400 text-sm">
                Sign in with your phone number
              </p>
            </div>

            {/* Phone Input */}
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
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
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
                  'Continue with Phone'
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-sm">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign-In Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              variant="outline"
              className="w-full h-14 bg-white text-gray-900 border-0 rounded-xl font-semibold text-base hover:bg-gray-100"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
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
              )}
              Continue with Google
            </Button>

            {/* Terms */}
            <p className="text-center text-xs text-gray-500 mt-8">
              By continuing, you agree to our{' '}
              <span className="text-[#00FF88]">Terms of Service</span>
              {' '}and{' '}
              <span className="text-[#00FF88]">Privacy Policy</span>
            </p>
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
                Enter the 6-digit code sent to +256 {phone}
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
                    <InputOTPSlot index={0} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white focus:border-[#00FF88]" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white focus:border-[#00FF88]" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white focus:border-[#00FF88]" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white focus:border-[#00FF88]" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white focus:border-[#00FF88]" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-lg bg-[#1A1A24] border-[#1A1A24] text-white focus:border-[#00FF88]" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg justify-center">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
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

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend code in {resendTimer}s
                  </p>
                ) : (
                  <button 
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-[#00FF88] font-medium text-sm"
                  >
                    Resend Code
                  </button>
                )}
              </div>
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
