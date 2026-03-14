/**
 * useMaskedCalling Hook
 * 
 * React hook for initiating masked calls without exposing phone numbers.
 */

'use client';

import { useState, useCallback } from 'react';

interface CallSession {
  id: string;
  status: string;
  proxyNumber?: string;
  createdAt?: Date;
  expiresAt?: Date;
}

interface UseMaskedCallingOptions {
  userId: string;
  userType: 'CLIENT' | 'RIDER' | 'MERCHANT';
}

interface UseMaskedCallingReturn {
  isCallLoading: boolean;
  activeCall: CallSession | null;
  error: string | null;
  initiateCall: (calleeId: string, calleeType: 'CLIENT' | 'RIDER' | 'MERCHANT', options?: {
    taskId?: string;
    taskType?: string;
  }) => Promise<boolean>;
  callSupport: (reason?: string) => Promise<boolean>;
  endCall: () => Promise<void>;
  clearError: () => void;
}

export function useMaskedCalling({ userId, userType }: UseMaskedCallingOptions): UseMaskedCallingReturn {
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiateCall = useCallback(async (
    calleeId: string,
    calleeType: 'CLIENT' | 'RIDER' | 'MERCHANT',
    options?: {
      taskId?: string;
      taskType?: string;
    }
  ): Promise<boolean> => {
    setIsCallLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calling/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: userId,
          callerType: userType,
          calleeId,
          calleeType,
          taskId: options?.taskId,
          taskType: options?.taskType,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to initiate call');
        setIsCallLoading(false);
        return false;
      }

      setActiveCall(data.session);
      setIsCallLoading(false);
      return true;
    } catch (err) {
      setError('Network error. Please try again.');
      setIsCallLoading(false);
      return false;
    }
  }, [userId, userType]);

  const callSupport = useCallback(async (reason?: string): Promise<boolean> => {
    setIsCallLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calling/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userType,
          reason,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to connect to support');
        setIsCallLoading(false);
        return false;
      }

      setActiveCall(data.session);
      setIsCallLoading(false);
      return true;
    } catch (err) {
      setError('Network error. Please try again.');
      setIsCallLoading(false);
      return false;
    }
  }, [userId, userType]);

  const endCall = useCallback(async (): Promise<void> => {
    if (!activeCall?.id) return;

    try {
      await fetch(`/api/calling/status/${activeCall.id}`, {
        method: 'DELETE',
      });
      setActiveCall(null);
    } catch (err) {
      console.error('Error ending call:', err);
    }
  }, [activeCall]);

  return {
    isCallLoading,
    activeCall,
    error,
    initiateCall,
    callSupport,
    endCall,
    clearError,
  };
}

export default useMaskedCalling;
