'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Shield,
  User,
  Clock,
  AlertCircle,
  PhoneCall,
  RotateCcw,
  Flag,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  X,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type CallState = 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallInfo {
  /** Unique call session ID */
  sessionId?: string;
  /** Caller/callee name */
  displayName: string;
  /** Role of the other party */
  role: 'client' | 'rider' | 'merchant' | 'support';
  /** Avatar URL */
  avatarUrl?: string;
  /** Task ID associated with the call */
  taskId?: string;
  /** Task number for display */
  taskNumber?: string;
  /** Whether this is an incoming call */
  isIncoming?: boolean;
  /** Phone number (masked) */
  maskedPhone?: string;
}

export interface CallInterfaceProps {
  /** Whether the call interface is visible */
  open: boolean;
  /** Call info */
  callInfo: CallInfo;
  /** Initial call state */
  initialState?: CallState;
  /** Called when call ends */
  onEnd: () => void;
  /** Called when user accepts incoming call */
  onAccept?: () => void;
  /** Called when user declines incoming call */
  onDecline?: () => void;
  /** Called when user requests callback */
  onCallBack?: () => void;
  /** Called when user wants to message */
  onMessage?: () => void;
  /** Called when user wants to report */
  onReport?: () => void;
}

// ============================================================================
// Signal Quality Indicator
// ============================================================================

function SignalQualityIndicator({ quality }: { quality: 'excellent' | 'good' | 'fair' | 'poor' }) {
  const config = {
    excellent: { icon: SignalHigh, color: 'text-[#005f3a]', label: 'HD' },
    good: { icon: SignalHigh, color: 'text-[#005f3a]', label: 'Good' },
    fair: { icon: SignalMedium, color: 'text-yellow-400', label: 'Fair' },
    poor: { icon: SignalLow, color: 'text-red-400', label: 'Poor' },
  };

  const cfg = config[quality];
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('h-4 w-4', cfg.color)} />
      <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
    </div>
  );
}

// ============================================================================
// Call Interface Component
// ============================================================================

export function CallInterface({
  open,
  callInfo,
  initialState = 'incoming',
  onEnd,
  onAccept,
  onDecline,
  onCallBack,
  onMessage,
  onReport,
}: CallInterfaceProps) {
  const [callState, setCallState] = useState<CallState>(initialState);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [signalQuality, setSignalQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [autoCloseTimer, setAutoCloseTimer] = useState(3);

  // Initialize call state
  useEffect(() => {
    if (open) {
      setCallState(initialState);
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeakerOn(false);
      setAutoCloseTimer(3);
    }
  }, [open, initialState]);

  // Call state transitions
  useEffect(() => {
    if (!open) return;

    let timer: NodeJS.Timeout;

    if (callState === 'connecting') {
      // Simulate connection delay
      timer = setTimeout(() => {
        setCallState('active');
      }, 2000);
    } else if (callState === 'active') {
      // Track call duration
      timer = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);

      // Randomly vary signal quality for realism
      const qualityTimer = setInterval(() => {
        const qualities: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'good', 'good', 'fair'];
        setSignalQuality(qualities[Math.floor(Math.random() * qualities.length)]);
      }, 8000);

      return () => {
        clearInterval(timer);
        clearInterval(qualityTimer);
      };
    } else if (callState === 'incoming') {
      // Auto-decline after 30s
      timer = setTimeout(() => {
        setCallState('ended');
      }, 30000);
    } else if (callState === 'ended') {
      // Auto-close after 3 seconds
      timer = setInterval(() => {
        setAutoCloseTimer((prev) => {
          if (prev <= 1) {
            onEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [callState, open, onEnd]);

  // Handle accept call
  const handleAccept = useCallback(() => {
    setCallState('active');
    onAccept?.();
  }, [onAccept]);

  // Handle decline call
  const handleDecline = useCallback(() => {
    setCallState('ended');
    onDecline?.();
  }, [onDecline]);

  // Handle end call
  const handleEndCall = useCallback(() => {
    setCallState('ended');
  }, []);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  const roleLabel = {
    client: 'Customer',
    rider: 'Rider',
    merchant: 'Merchant',
    support: 'Support',
  }[callInfo.role];

  return (
    <div className="fixed inset-0 z-[100] bg-[#f8f9fa] flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {callState === 'incoming' && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#005f3a]/10 rounded-full blur-[120px] animate-pulse" />
        )}
        {callState === 'active' && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#005f3a]/5 rounded-full blur-[120px]" />
        )}
        {callState === 'ended' && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[120px]" />
        )}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ================================================================== */}
        {/* PRIVACY HEADER */}
        {/* ================================================================== */}
        <div className="px-4 pt-6 pb-2 text-center">
          <div className="inline-flex items-center gap-2 bg-[#005f3a]/10 border border-[#005f3a]/20 rounded-full px-3 py-1.5">
            <Shield className="h-3 w-3 text-[#005f3a]" />
            <span className="text-[#005f3a] text-xs font-medium">Secure Call &bull; Numbers Hidden</span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* MAIN CONTENT */}
        {/* ================================================================== */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Avatar */}
          <div className="relative mb-6">
            {/* Ring animation for incoming call */}
            {callState === 'incoming' && (
              <>
                <div className="absolute inset-[-12px] rounded-full border-2 border-[#005f3a]/30 animate-ping" />
                <div className="absolute inset-[-20px] rounded-full border border-[#005f3a]/15 animate-pulse" />
                <div className="absolute inset-[-28px] rounded-full border border-[#005f3a]/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </>
            )}

            {/* Connected ring for active call */}
            {callState === 'active' && (
              <div className="absolute inset-[-4px] rounded-full border-2 border-[#005f3a]/40 animate-pulse" />
            )}

            <div className={cn(
              'w-28 h-28 rounded-full flex items-center justify-center',
              callInfo.avatarUrl ? '' : 'bg-gradient-to-br from-[#f3f4f5] to-[#e8ebe8] border border-[#bec9bf]/40'
            )}>
              {callInfo.avatarUrl ? (
                <img
                  src={callInfo.avatarUrl}
                  alt={callInfo.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className={cn(
                  'h-14 w-14',
                  callState === 'ended' ? 'text-[#bec9bf]' : 'text-[#6f7a71]'
                )} />
              )}
            </div>
          </div>

          {/* Name */}
          <h2 className={cn(
            'text-2xl font-bold mb-1',
            callState === 'ended' ? 'text-[#6f7a71]' : 'text-[#191c1d]'
          )}>
            {callInfo.displayName}
          </h2>

          {/* Role & Phone */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={cn(
              'text-xs border-0',
              callState === 'active' ? 'bg-[#005f3a]/10 text-[#005f3a]' : 'bg-[#f3f4f5] text-[#6f7a71]'
            )}>
              {roleLabel}
            </Badge>
            {callInfo.taskNumber && (
              <Badge variant="outline" className="bg-[#f3f4f5] text-[#6f7a71] text-[10px] border-0">
                {callInfo.taskNumber}
              </Badge>
            )}
          </div>

          {/* Call Status */}
          <div className="text-center mt-2">
            {callState === 'incoming' && (
              <div className="flex items-center justify-center gap-2 text-[#005f3a]">
                <PhoneCall className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">Incoming Call...</span>
              </div>
            )}
            {callState === 'connecting' && (
              <div className="flex items-center justify-center gap-2 text-[#005f3a]">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#005f3a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#005f3a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#005f3a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium">Connecting...</span>
              </div>
            )}
            {callState === 'active' && (
              <div className="space-y-2">
                <div className="text-3xl font-mono font-bold text-[#191c1d] tracking-wider">
                  {formatDuration(callDuration)}
                </div>
                <SignalQualityIndicator quality={signalQuality} />
              </div>
            )}
            {callState === 'ended' && (
              <div className="space-y-1">
                <p className="text-red-400 font-medium text-sm">Call Ended</p>
                {callDuration > 0 && (
                  <p className="text-[#6f7a71] text-sm">Duration: {formatDuration(callDuration)}</p>
                )}
                <p className="text-[#bec9bf] text-xs">Closing in {autoCloseTimer}s...</p>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* CALL CONTROLS */}
        {/* ================================================================== */}
        <div className="px-4 pb-12">
          {/* Incoming Call Controls */}
          {callState === 'incoming' && (
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleDecline}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors active:scale-95"
                >
                  <PhoneOff className="h-7 w-7 text-white" />
                </button>
                <span className="text-[#6f7a71] text-xs">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="w-16 h-16 bg-[#005f3a] rounded-full flex items-center justify-center shadow-lg shadow-[#005f3a]/15 hover:bg-[#005f3a]/90 transition-colors active:scale-95 animate-pulse"
                >
                  <Phone className="h-7 w-7 text-white" />
                </button>
                <span className="text-[#005f3a]/60 text-xs">Accept</span>
              </div>
            </div>
          )}

          {/* Connecting Controls */}
          {callState === 'connecting' && (
            <div className="flex justify-center">
              <button
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="h-7 w-7 text-white" />
              </button>
            </div>
          )}

          {/* Active Call Controls */}
          {callState === 'active' && (
            <div className="space-y-6">
              {/* Secondary controls */}
              <div className="flex justify-center gap-6">
                <ControlButton
                  icon={isMuted ? MicOff : Mic}
                  label={isMuted ? 'Unmute' : 'Mute'}
                  active={isMuted}
                  activeColor="red"
                  onClick={() => setIsMuted(!isMuted)}
                />
                <ControlButton
                  icon={isSpeakerOn ? Volume2 : VolumeX}
                  label={isSpeakerOn ? 'Speaker On' : 'Speaker'}
                  active={isSpeakerOn}
                  activeColor="emerald"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                />
              </div>

              {/* End Call */}
              <div className="flex justify-center">
                <button
                  onClick={handleEndCall}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors active:scale-95"
                >
                  <PhoneOff className="h-7 w-7 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Call Ended Controls */}
          {callState === 'ended' && (
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                <EndAction
                  icon={RotateCcw}
                  label="Call Back"
                  onClick={() => {
                    setCallState('connecting');
                    setCallDuration(0);
                    onCallBack?.();
                  }}
                />
                <EndAction
                  icon={MessageSquare}
                  label="Message"
                  onClick={() => onMessage?.()}
                />
                <EndAction
                  icon={Flag}
                  label="Report"
                  onClick={() => onReport?.()}
                />
              </div>

              <Button
                onClick={onEnd}
                variant="outline"
                className="w-full bg-[#f3f4f5] border-[#bec9bf]/40 text-[#6f7a71] hover:bg-[#e8ebe8] rounded-xl"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ControlButton({
  icon: Icon,
  label,
  active,
  activeColor,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  activeColor: 'red' | 'emerald';
  onClick: () => void;
}) {
  const activeBg = activeColor === 'red' ? 'bg-red-500' : 'bg-[#005f3a]';
  const activeIcon = activeColor === 'red' ? 'text-white' : 'text-white';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all',
          active ? activeBg : 'bg-[#f3f4f5] hover:bg-[#e8ebe8]'
        )}
      >
        <Icon className={cn('h-6 w-6', active ? activeIcon : 'text-[#3f4941]')} />
      </button>
      <span className={cn('text-xs', active ? 'text-[#191c1d]' : 'text-[#6f7a71]')}>
        {label}
      </span>
    </div>
  );
}

function EndAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="w-14 h-14 rounded-full bg-[#f3f4f5] hover:bg-[#e8ebe8] flex items-center justify-center transition-colors group-active:scale-95">
        <Icon className="h-6 w-6 text-[#3f4941]" />
      </div>
      <span className="text-[#6f7a71] text-xs">{label}</span>
    </button>
  );
}

export default CallInterface;
