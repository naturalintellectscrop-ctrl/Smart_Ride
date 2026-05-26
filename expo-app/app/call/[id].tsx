// ============================================
// SMART RIDE MOBILE - IN-APP CALL SCREEN
// ============================================
// Premium full-screen call interface matching
// admin dashboard's design patterns
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
} from 'react-native-reanimated';
import { api } from '@/src/services/api';
import { COLORS, GRADIENTS } from '@/src/constants';

// ============================================
// CALL STATE TYPES
// ============================================

type CallState = 'incoming' | 'outgoing' | 'connecting' | 'active' | 'ended';

interface CallInfo {
  sessionId: string;
  recipientId: string;
  recipientName: string;
  conversationId?: string;
}

// ============================================
// PULSE RING COMPONENT (animated rings around avatar)
// ============================================

function PulseRing({ delay: delayMs }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1500 }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 1500 }),
          withTiming(0.6, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[pulseStyles.ring, animatedStyle]} />;
}

const pulseStyles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
});

// ============================================
// AVATAR WITH PULSE RINGS
// ============================================

function CallAvatar({ isRinging, isConnected }: { isRinging: boolean; isConnected: boolean }) {
  const ringColor = isConnected ? COLORS.primary : COLORS.secondary;

  return (
    <View style={avatarStyles.container}>
      {isRinging && (
        <>
          <PulseRing delay={0} />
          <PulseRing delay={500} />
          <PulseRing delay={1000} />
        </>
      )}
      <View style={[
        avatarStyles.circle,
        isConnected && avatarStyles.circleConnected,
        { borderColor: isConnected ? COLORS.primary : (isRinging ? COLORS.secondary : COLORS.border) },
      ]}>
        <Ionicons name="person" size={36} color={isConnected ? COLORS.primary : COLORS.text} />
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleConnected: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});

// ============================================
// CALL DURATION TIMER
// ============================================

function CallTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Text style={styles.timer}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </Text>
  );
}

// ============================================
// MAIN CALL SCREEN
// ============================================

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    conversationId?: string;
    isIncoming?: string;
  }>();
  const insets = useSafeAreaInsets();

  const recipientId = params.id;
  const recipientName = params.name || 'Unknown';
  const conversationId = params.conversationId;
  const isIncoming = params.isIncoming === 'true';

  const [callState, setCallState] = useState<CallState>(
    isIncoming ? 'incoming' : 'outgoing'
  );
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callStartTime, setCallStartTime] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isInitiating, setIsInitiating] = useState(false);

  // Auto-connect simulation for outgoing calls
  useEffect(() => {
    if (callState === 'outgoing') {
      const timer = setTimeout(() => {
        setCallState('connecting');
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (callState === 'connecting') {
      const timer = setTimeout(() => {
        setCallState('active');
        setCallStartTime(Date.now());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [callState]);

  // Vibration for incoming calls
  useEffect(() => {
    if (callState === 'incoming') {
      const pattern = [0, 500, 500, 500, 500, 500, 500, 500];
      Vibration.vibrate(pattern, true);
      return () => Vibration.cancel();
    }
  }, [callState === 'incoming']);

  // Initiate call via API
  useEffect(() => {
    if (!isIncoming && !callInfo && !isInitiating) {
      initiateCall();
    }
  }, []);

  const initiateCall = async () => {
    setIsInitiating(true);
    try {
      const response = await api.initiateCall({
        recipientId,
        recipientType: 'RIDER',
        taskId: conversationId?.replace('conv-', ''),
      });
      if (response.success && response.data) {
        setCallInfo({
          sessionId: response.data.sessionId,
          recipientId,
          recipientName,
          conversationId,
        });
      }
    } catch (error) {
      console.log('[CALL] Initiate error:', error);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleAnswer = useCallback(() => {
    Vibration.cancel();
    setCallState('active');
    setCallStartTime(Date.now());
  }, []);

  const handleDecline = useCallback(() => {
    Vibration.cancel();
    setCallState('ended');
    setCallDuration(0);
  }, []);

  const handleEndCall = useCallback(async () => {
    const endTime = Date.now();
    const duration = callStartTime > 0 ? Math.floor((endTime - callStartTime) / 1000) : 0;
    setCallDuration(duration);

    if (callInfo?.sessionId) {
      try {
        await api.endCall(callInfo.sessionId);
      } catch (error) {
        console.log('[CALL] End error:', error);
      }
    }

    setCallState('ended');
  }, [callInfo, callStartTime]);

  const handleCancel = useCallback(() => {
    setCallState('ended');
    setCallDuration(0);
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const handleChat = useCallback(() => {
    if (conversationId) {
      // End the call first
      handleEndCall();
      router.replace(`/chat/${conversationId}` as any);
    }
  }, [conversationId, handleEndCall]);

  const isRinging = callState === 'incoming' || callState === 'outgoing';
  const isConnected = callState === 'active';

  const getCallStateLabel = () => {
    switch (callState) {
      case 'incoming': return 'Incoming Call...';
      case 'outgoing': return 'Calling...';
      case 'connecting': return 'Connecting...';
      case 'active': return 'Connected';
      case 'ended': return 'Call Ended';
      default: return '';
    }
  };

  // ========================================
  // RENDER: INCOMING CALL
  // ========================================

  const renderIncomingState = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stateContainer}>
      <CallAvatar isRinging={true} isConnected={false} />
      <Text style={styles.nameText}>{recipientName}</Text>
      <Text style={styles.stateLabel}>{getCallStateLabel()}</Text>

      <View style={styles.incomingActions}>
        <TouchableOpacity
          style={styles.declineButtonSmall}
          onPress={handleDecline}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={GRADIENTS.danger as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.declineGradient}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.answerButton}
          onPress={handleAnswer}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={GRADIENTS.primary as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.answerGradient}
          >
            <Ionicons name="call" size={28} color={COLORS.background} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonLabels}>
        <Text style={styles.buttonLabelDecline}>Decline</Text>
        <Text style={styles.buttonLabelAnswer}>Answer</Text>
      </View>
    </Animated.View>
  );

  // ========================================
  // RENDER: OUTGOING / CONNECTING
  // ========================================

  const renderOutgoingState = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stateContainer}>
      <CallAvatar isRinging={true} isConnected={false} />
      <Text style={styles.nameText}>{recipientName}</Text>
      <View style={styles.connectingRow}>
        {callState === 'connecting' && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.connectingSpinner} />
        )}
        <Text style={styles.stateLabel}>{getCallStateLabel()}</Text>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancel}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={GRADIENTS.danger as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cancelGradient}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
          <Text style={styles.cancelText}>Cancel</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ========================================
  // RENDER: ACTIVE CALL
  // ========================================

  const renderActiveState = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stateContainer}>
      <CallAvatar isRinging={false} isConnected={true} />
      <Text style={styles.nameText}>{recipientName}</Text>
      <Text style={styles.stateLabelConnected}>Connected</Text>
      <CallTimer startTime={callStartTime} />

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionCircle, isMuted && styles.actionCircleActive]}
          onPress={() => setIsMuted(!isMuted)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'mic-off-outline' : 'mic-outline'}
            size={24}
            color={isMuted ? COLORS.error : COLORS.text}
          />
          <Text style={[styles.actionLabel, isMuted && styles.actionLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCircle, isSpeaker && styles.actionCircleActive]}
          onPress={() => setIsSpeaker(!isSpeaker)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSpeaker ? 'volume-high-outline' : 'volume-mute-outline'}
            size={24}
            color={isSpeaker ? COLORS.secondary : COLORS.text}
          />
          <Text style={[styles.actionLabel, isSpeaker && styles.actionLabelSpeaker]}>
            Speaker
          </Text>
        </TouchableOpacity>

        {conversationId && (
          <TouchableOpacity
            style={styles.actionCircle}
            onPress={handleChat}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.text} />
            <Text style={styles.actionLabel}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* End Call */}
      <TouchableOpacity
        style={styles.endCallButton}
        onPress={handleEndCall}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={GRADIENTS.danger as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.endCallGradient}
        >
          <Ionicons name="call" size={24} color="#FFFFFF" style={styles.endCallIcon} />
          <Text style={styles.endCallText}>End Call</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ========================================
  // RENDER: CALL ENDED
  // ========================================

  const renderEndedState = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stateContainer}>
      <View style={styles.endedAvatar}>
        <Ionicons name="person" size={36} color={COLORS.textDim} />
      </View>
      <Text style={styles.nameText}>{recipientName}</Text>
      <Text style={styles.endedLabel}>Call Ended</Text>
      {callDuration > 0 && (
        <Text style={styles.durationSummary}>
          Duration: {Math.floor(callDuration / 60)}m {callDuration % 60}s
        </Text>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backGradient}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.background} />
          <Text style={styles.backText}>Back</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Ambient gradient effects */}
      <View style={styles.ambientTop}>
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.08)', 'transparent']}
          style={styles.ambientGradient}
        />
      </View>
      <View style={styles.ambientBottom}>
        <LinearGradient
          colors={['transparent', 'rgba(0, 212, 255, 0.06)']}
          style={styles.ambientGradient}
        />
      </View>

      {/* Safe area top padding */}
      <View style={{ paddingTop: insets.top || 44 }} />

      {/* Content based on call state */}
      {callState === 'incoming' && renderIncomingState()}
      {(callState === 'outgoing' || callState === 'connecting') && renderOutgoingState()}
      {callState === 'active' && renderActiveState()}
      {callState === 'ended' && renderEndedState()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ambient Effects
  ambientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  ambientGradient: {
    flex: 1,
  },

  // State Container
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },

  // Name & State
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stateLabel: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  stateLabelConnected: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 4,
  },

  // Timer
  timer: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.text,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 40,
  },

  // Connecting row
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  connectingSpinner: {
    marginRight: 0,
  },

  // Incoming Call Actions
  incomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 60,
    marginTop: 60,
  },
  answerButton: {
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  answerGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonSmall: {
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  declineGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    marginTop: 8,
    width: '100%',
  },
  buttonLabelDecline: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
  buttonLabelAnswer: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Cancel Button (outgoing)
  cancelButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 60,
    width: '80%',
    maxWidth: 300,
  },
  cancelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Active Call Action Row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 40,
  },
  actionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37, 37, 48, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  actionLabelActive: {
    color: COLORS.error,
  },
  actionLabelSpeaker: {
    color: COLORS.secondary,
  },

  // End Call Button
  endCallButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '80%',
    maxWidth: 300,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  endCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Ended State
  endedAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  endedLabel: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 8,
  },
  durationSummary: {
    fontSize: 15,
    color: COLORS.textDim,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 48,
  },

  // Back Button
  backButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '60%',
    maxWidth: 240,
  },
  backGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  backText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
