/**
 * MaskedCallButton Component
 * 
 * A button component for initiating masked calls without exposing phone numbers.
 * Shows loading state and handles errors gracefully.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, PhoneOff, Loader2, Headphones, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'error';

interface MaskedCallButtonProps {
  // User info
  userId: string;
  userType: 'CLIENT' | 'RIDER' | 'MERCHANT';
  
  // Callee info (the person being called)
  calleeId: string;
  calleeType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT';
  calleeDisplayName: string; // Masked name (e.g., "Rider (UAX 123A)" or "Client")
  
  // Optional task info
  taskId?: string;
  taskType?: string;
  
  // Button customization
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
  label?: string;
  
  // Callbacks
  onCallInitiated?: (sessionId: string) => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

export function MaskedCallButton({
  userId,
  userType,
  calleeId,
  calleeType,
  calleeDisplayName,
  taskId,
  taskType,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
  label,
  onCallInitiated,
  onCallEnded,
  onError,
}: MaskedCallButtonProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleInitiateCall = async () => {
    setCallStatus('connecting');
    setError(null);
    setShowDialog(true);

    try {
      const endpoint = calleeType === 'SUPPORT' ? '/api/calling/support' : '/api/calling/initiate';
      
      const body = calleeType === 'SUPPORT' 
        ? { userId, userType }
        : {
            callerId: userId,
            callerType: userType,
            calleeId,
            calleeType,
            taskId,
            taskType,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        setCallStatus('error');
        setError(data.error || 'Failed to connect call');
        onError?.(data.error || 'Failed to connect call');
        return;
      }

      setSessionId(data.session.id);
      setCallStatus('ringing');
      onCallInitiated?.(data.session.id);

      // Simulate call flow for demo
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => setCallStatus('ringing'), 1000);
        setTimeout(() => setCallStatus('connected'), 3000);
      }
    } catch (err) {
      setCallStatus('error');
      setError('Network error. Please check your connection and try again.');
      onError?.('Network error');
    }
  };

  const handleEndCall = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/calling/status/${sessionId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }
    setCallStatus('ended');
    onCallEnded?.();
    setTimeout(() => {
      setShowDialog(false);
      setCallStatus('idle');
      setSessionId(null);
    }, 1500);
  };

  const getStatusMessage = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return `Calling ${calleeDisplayName}...`;
      case 'connected':
        return `Connected with ${calleeDisplayName}`;
      case 'ended':
        return 'Call ended';
      case 'error':
        return error || 'Call failed';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (callStatus) {
      case 'connecting':
      case 'ringing':
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
      case 'connected':
        return <Phone className="h-12 w-12 text-green-500 animate-pulse" />;
      case 'ended':
        return <CheckCircle className="h-12 w-12 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Phone className="h-12 w-12 text-gray-400" />;
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInitiateCall}
        disabled={callStatus === 'connecting' || callStatus === 'ringing'}
        className={cn(
          "gap-2",
          callStatus === 'connecting' || callStatus === 'ringing' 
            ? "opacity-70 cursor-wait" 
            : "",
          className
        )}
      >
        {callStatus === 'connecting' || callStatus === 'ringing' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : callStatus === 'connected' ? (
          <PhoneOff className="h-4 w-4" />
        ) : calleeType === 'SUPPORT' ? (
          <Headphones className="h-4 w-4" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        {showLabel && (
          <span>{label || (calleeType === 'SUPPORT' ? 'Contact Support' : 'Call')}</span>
        )}
      </Button>

      {/* Call Status Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open && callStatus !== 'connecting' && callStatus !== 'ringing') {
          setShowDialog(open);
          setCallStatus('idle');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4">
              {getStatusIcon()}
            </div>
            <DialogTitle className="text-center">
              {callStatus === 'connected' ? 'In Call' : getStatusMessage()}
            </DialogTitle>
            {callStatus === 'connected' && (
              <DialogDescription className="text-center">
                Your phone number is protected
              </DialogDescription>
            )}
            {callStatus === 'error' && (
              <DialogDescription className="text-center text-red-500">
                {error}
              </DialogDescription>
            )}
          </DialogHeader>

          {callStatus === 'connected' && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Speaking with: <strong>{calleeDisplayName}</strong></p>
              <p className="mt-2 text-xs">
                🔒 Phone numbers are hidden for privacy
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
            {(callStatus === 'connected' || callStatus === 'ringing') && (
              <Button
                variant="destructive"
                onClick={handleEndCall}
                className="gap-2"
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </Button>
            )}
            
            {callStatus === 'error' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleInitiateCall}>
                  Try Again
                </Button>
              </div>
            )}
            
            {callStatus === 'ended' && (
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MaskedCallButton;
