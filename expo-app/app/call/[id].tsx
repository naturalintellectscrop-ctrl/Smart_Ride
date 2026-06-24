// ============================================
// SMART RIDE MOBILE - IN-APP CALL SCREEN
// ============================================
// Premium full-screen call interface with
// real Agora.io VoIP integration for in-app
// voice calls. Falls back to phone dialer
// when Agora native SDK is unavailable.
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
  Linking,
  Alert,
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
import { GRADIENTS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { isAgoraConfigured, AGORA_CONFIG } from '@/src/config/agora';
import { useAgoraCall } from '@/src/hooks/useAgoraCall';

// ============================================
// CALL STATE TYPES
// ============================================

type CallState = 'incoming' | 'outgoing' | 'connecting' | 'active' | 'ended';

interface CallInfo {
  sessionId: string;
  channelId: string;
  recipientId: string;
  recipientName: string;
  recipientPhone?: string;
  conversationId?: string;
  agoraAppId: string;
  isAgoraAvailable: boolean;
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

const create_pulseStyles = (COLORS: ThemedColors) => StyleSheet.create({
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
        { borderColor: isConnected ? COLORS.primary : (isRinging ? COLORS.secondary : COLORS.outlineVariant) },
      ]}>
        <Ionicons name="person" size={36} color={isConnected ? COLORS.primary : COLORS.onSurface} />
      </View>
    </View>
  );
}

const create_avatarStyles = (COLORS: ThemedColors) => StyleSheet.create({
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
    backgroundColor: COLORS.surfaceContainerLow,
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
  { const __t = useTheme(); COLORS = makeThemedColors(__t.isDark); pulseStyles = create_pulseStyles(COLORS); avatarStyles = create_avatarStyles(COLORS); styles = create_styles(COLORS); }
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    phone?: string;
    conversationId?: string;
    isIncoming?: string;
    sessionId?: string;
    channelId?: string;
  }>();
  const insets = useSafeAreaInsets();

  // Agora hook for real VoIP calls
  const agoraCall = useAgoraCall();

  const recipientId = params.id;
  const recipientName = params.name || 'Unknown';
  const recipientPhone = params.phone;
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
  const [initiateError, setInitiateError] = useState<string | null>(null);

  // Refs for cleanup
  const ringingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasJoinedChannel = useRef(false);

  // ============================================
  // SYNC AGORA STATE WITH CALL STATE
  // ============================================

  // When Agora call state changes, update our call state
  useEffect(() => {
    if (agoraCall.callState === 'connected' && callState === 'connecting') {
      // Agora successfully connected!
      setCallState('active');
      setCallStartTime(Date.now());
      hasJoinedChannel.current = true;
    } else if (agoraCall.callState === 'reconnecting' && callState === 'active') {
      // Connection interrupted, but we keep the UI in active state with a reconnect indicator
      console.log('[CALL] Agora reconnecting...');
    } else if (agoraCall.callState === 'ended' && hasJoinedChannel.current) {
      // Agora channel ended (remote user left or we left)
      if (callState === 'active') {
        const duration = callStartTime > 0 ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
        setCallDuration(duration);
        setCallState('ended');
        hasJoinedChannel.current = false;
      }
    }
  }, [agoraCall.callState, callState, callStartTime]);

  // Sync mute/speaker state from Agora hook
  useEffect(() => {
    if (hasJoinedChannel.current) {
      setIsMuted(agoraCall.isMuted);
      setIsSpeaker(agoraCall.isSpeakerOn);
    }
  }, [agoraCall.isMuted, agoraCall.isSpeakerOn]);

  // Show Agora errors
  useEffect(() => {
    if (agoraCall.error && callState !== 'ended') {
      console.warn('[CALL] Agora error:', agoraCall.error);
      // Don't show error to user if we can fall back to phone
      if (!recipientPhone) {
        setInitiateError(agoraCall.error);
      }
    }
  }, [agoraCall.error, callState, recipientPhone]);

  // ============================================
  // CALL LIFECYCLE
  // ============================================

  // Vibration for incoming calls
  useEffect(() => {
    if (callState === 'incoming') {
      const pattern = [0, 500, 500, 500, 500, 500, 500, 500];
      Vibration.vibrate(pattern, true);
      return () => Vibration.cancel();
    }
  }, [callState === 'incoming']);

  // For INCOMING calls: populate callInfo from URL params (no API call needed)
  useEffect(() => {
    if (isIncoming && params.sessionId && params.channelId && !callInfo) {
      setCallInfo({
        sessionId: params.sessionId,
        channelId: params.channelId,
        recipientId,
        recipientName,
        recipientPhone: undefined,
        conversationId,
        agoraAppId: '',
        isAgoraAvailable: agoraCall.isSdkAvailable,
      });
    }
  }, [isIncoming, params.sessionId, params.channelId]);

  // For OUTGOING calls: initiate via API
  useEffect(() => {
    if (!isIncoming && !callInfo && !isInitiating) {
      initiateCall();
    }
  }, []);

  // State transition: outgoing → connecting (after call is initiated)
  useEffect(() => {
    if (callState === 'outgoing' && callInfo) {
      // Call session created, transition to connecting and join Agora channel
      const timer = setTimeout(() => {
        setCallState('connecting');
        joinAgoraChannel();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [callState, callInfo]);

  // Ringing timeout — mark as missed after 30s
  useEffect(() => {
    if (callState === 'outgoing' || callState === 'connecting') {
      ringingTimeoutRef.current = setTimeout(() => {
        handleCallMissed();
      }, AGORA_CONFIG.timeouts.ringingTimeout);
      return () => {
        if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      };
    }
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Vibration.cancel();
      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      if (connectingTimeoutRef.current) clearTimeout(connectingTimeoutRef.current);
    };
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const initiateCall = async () => {
    setIsInitiating(true);
    setInitiateError(null);
    try {
      const response = await api.initiateCall({
        recipientId,
        recipientType: 'RIDER',
        taskId: conversationId?.replace('conv-', ''),
      });
      if (response.success && response.data) {
        setCallInfo({
          sessionId: response.data.sessionId,
          channelId: response.data.channelId,
          recipientId,
          recipientName,
          recipientPhone,
          conversationId,
          agoraAppId: response.data.agoraAppId || '',
          isAgoraAvailable: !!(response.data.agoraAppId) && agoraCall.isSdkAvailable,
        });
      } else {
        setInitiateError(response.error || 'Failed to initiate call');
        setCallInfo({
          sessionId: '',
          channelId: '',
          recipientId,
          recipientName,
          recipientPhone,
          conversationId,
          agoraAppId: '',
          isAgoraAvailable: false,
        });
      }
    } catch (error) {
      console.log('[CALL] Initiate error:', error);
      setInitiateError('Network error. Please try again.');
      setCallInfo({
        sessionId: '',
        channelId: '',
        recipientId,
        recipientName,
        recipientPhone,
        conversationId,
        agoraAppId: '',
        isAgoraAvailable: false,
      });
    } finally {
      setIsInitiating(false);
    }
  };

  // ============================================
  // AGORA CHANNEL JOIN
  // ============================================

  const joinAgoraChannel = async () => {
    if (!callInfo?.channelId) return;

    if (agoraCall.isSdkAvailable && callInfo.isAgoraAvailable) {
      // Real Agora SDK available — join the channel
      console.log('[CALL] Joining Agora channel:', callInfo.channelId);
      await agoraCall.joinChannel(callInfo.channelId);
    } else {
      // Agora SDK not available (Expo Go, or no native module)
      // Simulate connection for UI demo; offer phone dialer fallback
      console.log('[CALL] Agora SDK not available, simulating connection');
      simulateConnection();
    }
  };

  /**
   * Fallback: simulate call connection when Agora native SDK is unavailable.
   * This happens in Expo Go or when native modules aren't linked.
   * The user can still use the phone dialer as a real fallback.
   */
  const simulateConnection = () => {
    connectingTimeoutRef.current = setTimeout(() => {
      setCallState('active');
      setCallStartTime(Date.now());
    }, 2000);
  };

  const handleCallMissed = async () => {
    if (callInfo?.sessionId) {
      try {
        await api.endCall(callInfo.sessionId);
      } catch (error) {
        console.log('[CALL] Missed call end error:', error);
      }
    }
    setCallDuration(0);
    setCallState('ended');
  };

  // ============================================
  // USER ACTIONS
  // ============================================

  const handleAnswer = useCallback(() => {
    Vibration.cancel();
    if (callInfo?.channelId && agoraCall.isSdkAvailable) {
      // Join the Agora channel for incoming call
      setCallState('connecting');
      agoraCall.joinChannel(callInfo.channelId);
    } else {
      // No Agora — simulate
      setCallState('active');
      setCallStartTime(Date.now());
    }
  }, [callInfo, agoraCall]);

  const handleDecline = useCallback(async () => {
    Vibration.cancel();
    if (hasJoinedChannel.current) {
      await agoraCall.leaveChannel();
    }
    if (callInfo?.sessionId) {
      try {
        await api.endCall(callInfo.sessionId);
      } catch (error) {
        console.log('[CALL] Decline end error:', error);
      }
    }
    setCallState('ended');
    setCallDuration(0);
  }, [callInfo, agoraCall]);

  const handleEndCall = useCallback(async () => {
    const endTime = Date.now();
    const duration = callStartTime > 0 ? Math.floor((endTime - callStartTime) / 1000) : 0;
    setCallDuration(duration);

    // Leave Agora channel if we're in one
    if (hasJoinedChannel.current) {
      await agoraCall.leaveChannel();
      hasJoinedChannel.current = false;
    }

    if (callInfo?.sessionId) {
      try {
        await api.endCall(callInfo.sessionId);
      } catch (error) {
        console.log('[CALL] End error:', error);
      }
    }

    setCallState('ended');
  }, [callInfo, callStartTime, agoraCall]);

  const handleCancel = useCallback(async () => {
    if (hasJoinedChannel.current) {
      await agoraCall.leaveChannel();
      hasJoinedChannel.current = false;
    }
    if (callInfo?.sessionId) {
      try {
        await api.endCall(callInfo.sessionId);
      } catch (error) {
        console.log('[CALL] Cancel end error:', error);
      }
    }
    setCallState('ended');
    setCallDuration(0);
  }, [callInfo, agoraCall]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const handleChat = useCallback(() => {
    if (conversationId) {
      handleEndCall();
      router.replace(`/chat/${conversationId}` as any);
    }
  }, [conversationId, handleEndCall]);

  const handleCallViaPhone = useCallback(() => {
    if (recipientPhone) {
      const phoneUrl = `tel:${recipientPhone}`;
      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Cannot make call', 'Phone dialer is not available on this device');
        }
      });
    } else {
      Alert.alert('No phone number', 'Recipient phone number is not available');
    }
  }, [recipientPhone]);

  // Toggle mute via Agora
  const handleToggleMute = useCallback(async () => {
    if (hasJoinedChannel.current) {
      await agoraCall.toggleMute();
    } else {
      setIsMuted(!isMuted);
    }
  }, [isMuted, agoraCall]);

  // Toggle speaker via Agora
  const handleToggleSpeaker = useCallback(async () => {
    if (hasJoinedChannel.current) {
      await agoraCall.toggleSpeaker();
    } else {
      setIsSpeaker(!isSpeaker);
    }
  }, [isSpeaker, agoraCall]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isRinging = callState === 'incoming' || callState === 'outgoing';
  const isConnected = callState === 'active';
  const isAgoraCall = hasJoinedChannel.current && agoraCall.isSdkAvailable;
  const showPhoneFallback = !agoraCall.isSdkAvailable && !!recipientPhone;
  const isReconnecting = agoraCall.callState === 'reconnecting';

  const getCallStateLabel = () => {
    switch (callState) {
      case 'incoming': return 'Incoming Call...';
      case 'outgoing':
        if (isInitiating) return 'Starting call...';
        if (initiateError) return 'Call failed';
        return 'Calling...';
      case 'connecting': return 'Connecting...';
      case 'active':
        if (isReconnecting) return 'Reconnecting...';
        if (isAgoraCall) return 'Connected • VoIP';
        return 'Connected';
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

      {/* Agora availability indicator */}
      {agoraCall.isSdkAvailable && (
        <View style={styles.voipAvailableBadge}>
          <Ionicons name="wifi-outline" size={12} color={COLORS.primary} />
          <Text style={styles.voipAvailableText}>In-app call available</Text>
        </View>
      )}

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
            <Ionicons name="call" size={28} color={COLORS.surface} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonLabels}>
        <Text style={styles.buttonLabelDecline}>Decline</Text>
        <Text style={styles.buttonLabelAnswer}>Answer</Text>
      </View>

      {!agoraCall.isSdkAvailable && recipientPhone && (
        <TouchableOpacity
          style={styles.phoneFallbackButton}
          onPress={handleCallViaPhone}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={18} color={COLORS.primary} />
          <Text style={styles.phoneFallbackText}>Answer via phone instead</Text>
        </TouchableOpacity>
      )}
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
        {(callState === 'connecting' || isInitiating) && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.connectingSpinner} />
        )}
        <Text style={styles.stateLabel}>{getCallStateLabel()}</Text>
      </View>

      {initiateError && (
        <Text style={styles.errorText}>{initiateError}</Text>
      )}

      {/* Call mode indicator */}
      {callState === 'connecting' && (
        <View style={styles.callModeIndicator}>
          <Ionicons
            name={agoraCall.isSdkAvailable ? 'wifi' : 'phone-portrait-outline'}
            size={14}
            color={agoraCall.isSdkAvailable ? COLORS.primary : COLORS.outline}
          />
          <Text style={styles.callModeText}>
            {agoraCall.isSdkAvailable ? 'In-app VoIP call' : 'Phone dialer mode'}
          </Text>
        </View>
      )}

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

      {/* Phone fallback for outgoing calls */}
      {showPhoneFallback && (
        <TouchableOpacity
          style={styles.phoneFallbackButton}
          onPress={handleCallViaPhone}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={18} color={COLORS.primary} />
          <Text style={styles.phoneFallbackText}>Call via phone instead</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // ========================================
  // RENDER: ACTIVE CALL
  // ========================================

  const renderActiveState = () => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stateContainer}>
      <CallAvatar isRinging={false} isConnected={true} />
      <Text style={styles.nameText}>{recipientName}</Text>
      <Text style={[
        styles.stateLabelConnected,
        isReconnecting && styles.stateLabelReconnecting,
      ]}>
        {getCallStateLabel()}
      </Text>
      <CallTimer startTime={callStartTime} />

      {/* VoIP call quality indicator */}
      {isAgoraCall && (
        <View style={styles.voipStatusBadge}>
          <Ionicons
            name={isReconnecting ? 'warning-outline' : 'wifi-outline'}
            size={12}
            color={isReconnecting ? COLORS.error : COLORS.primary}
          />
          <Text style={[
            styles.voipStatusText,
            isReconnecting && styles.voipStatusReconnecting,
          ]}>
            {isReconnecting ? 'Reconnecting...' : 'Internet call'}
          </Text>
        </View>
      )}

      {/* Non-VoIP indicator */}
      {!isAgoraCall && (
        <View style={styles.voipStatusBadge}>
          <Ionicons name="phone-portrait-outline" size={12} color={COLORS.outline} />
          <Text style={styles.voipStatusText}>Phone call mode</Text>
        </View>
      )}

      {/* Remote user indicator */}
      {isAgoraCall && !agoraCall.hasRemoteUser && !isReconnecting && (
        <Text style={styles.waitingText}>Waiting for other person to join...</Text>
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionCircle, isMuted && styles.actionCircleActive]}
          onPress={handleToggleMute}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'mic-off-outline' : 'mic-outline'}
            size={24}
            color={isMuted ? COLORS.error : COLORS.onSurface}
          />
          <Text style={[styles.actionLabel, isMuted && styles.actionLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCircle, isSpeaker && styles.actionCircleActive]}
          onPress={handleToggleSpeaker}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSpeaker ? 'volume-high-outline' : 'volume-mute-outline'}
            size={24}
            color={isSpeaker ? COLORS.secondary : COLORS.onSurface}
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
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.onSurface} />
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
        <Ionicons name="person" size={36} color={COLORS.outlineVariant} />
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
          <Ionicons name="arrow-back" size={20} color={COLORS.surface} />
          <Text style={styles.backText}>Back</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Call again options */}
      <View style={styles.callAgainOptions}>
        {agoraCall.isSdkAvailable && (
          <TouchableOpacity
            style={styles.callAgainButton}
            onPress={() => {
              // Re-initiate an in-app call
              setCallState('outgoing');
              setCallInfo(null);
              setCallDuration(0);
              setCallStartTime(0);
              hasJoinedChannel.current = false;
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            <Text style={styles.callAgainText}>In-app call again</Text>
          </TouchableOpacity>
        )}

        {recipientPhone && (
          <TouchableOpacity
            style={styles.callAgainButton}
            onPress={handleCallViaPhone}
            activeOpacity={0.7}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={COLORS.outline} />
            <Text style={[styles.callAgainText, { color: COLORS.outline }]}>Call via phone</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Ambient gradient effects */}
      <View style={styles.ambientTop}>
        <LinearGradient
          colors={['rgba(0, 95, 58, 0.08)', 'transparent']}
          style={styles.ambientGradient}
        />
      </View>
      <View style={styles.ambientBottom}>
        <LinearGradient
          colors={['transparent', COLORS.surfaceContainer]}
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

const create_styles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
    color: COLORS.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stateLabel: {
    fontSize: 16,
    color: COLORS.outline,
    marginBottom: 8,
  },
  stateLabelConnected: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 4,
  },
  stateLabelReconnecting: {
    color: COLORS.error,
  },

  // Timer
  timer: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.onSurface,
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

  // Error text
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginBottom: 16,
    textAlign: 'center',
  },

  // VoIP Available Badge (incoming)
  voipAvailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 95, 58, 0.08)',
    marginBottom: 16,
  },
  voipAvailableText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Call Mode Indicator (connecting)
  callModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: 16,
  },
  callModeText: {
    fontSize: 12,
    color: COLORS.onSurface,
    fontWeight: '500',
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

  // Phone Fallback Button
  phoneFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 95, 58, 0.08)',
  },
  phoneFallbackText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // VoIP Status Badge
  voipStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: 16,
  },
  voipStatusText: {
    fontSize: 11,
    color: COLORS.outline,
    fontWeight: '500',
  },
  voipStatusReconnecting: {
    color: COLORS.error,
  },

  // Waiting text
  waitingText: {
    fontSize: 12,
    color: COLORS.outline,
    fontStyle: 'italic',
    marginBottom: 16,
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
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
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
    color: COLORS.outline,
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
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  endedLabel: {
    fontSize: 18,
    color: COLORS.outline,
    fontWeight: '600',
    marginBottom: 8,
  },
  durationSummary: {
    fontSize: 15,
    color: COLORS.outlineVariant,
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
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },

  // Call Again Options
  callAgainOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  callAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 95, 58, 0.08)',
  },
  callAgainText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
