// ============================================
// SMART RIDE MOBILE - AGORA CALL HOOK
// ============================================
// Manages the full Agora RTC engine lifecycle
// for in-app VoIP voice calls.
//
// Features:
// - Initialize/destroy RtcEngine
// - Join/leave channels with server-generated tokens
// - Mute/unmute microphone
// - Toggle speaker
// - Remote user join/leave events
// - Automatic cleanup on unmount
// - Graceful fallback when Agora SDK is unavailable
// ============================================

import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { getAgoraAppId, isAgoraConfigured } from '@/src/config/agora';
import { api } from '@/src/services/api';

// ============================================
// TYPES
// ============================================

export type AgoraCallState =
  | 'idle'        // No call active
  | 'joining'     // Requesting token & joining channel
  | 'connected'   // In an active call (joined channel)
  | 'reconnecting'// Network interrupted, trying to reconnect
  | 'ended';      // Call has ended

export interface AgoraCallInfo {
  channelId: string;
  token: string;
  uid: number;
  appId: string;
}

export interface UseAgoraCallReturn {
  /** Current call state */
  callState: AgoraCallState;
  /** Whether the local microphone is muted */
  isMuted: boolean;
  /** Whether speaker is on */
  isSpeakerOn: boolean;
  /** Whether a remote user is in the channel */
  hasRemoteUser: boolean;
  /** Whether Agora SDK is available on this device */
  isSdkAvailable: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Join a channel with a session ID */
  joinChannel: (channelId: string) => Promise<void>;
  /** Leave the current channel */
  leaveChannel: () => Promise<void>;
  /** Toggle microphone mute */
  toggleMute: () => Promise<void>;
  /** Toggle speaker */
  toggleSpeaker: () => Promise<void>;
  /** Switch to phone dialer fallback */
  switchToPhoneFallback: () => string | null;
}

// ============================================
// AGORA SDK DYNAMIC IMPORT
// ============================================
// We dynamically import the Agora SDK so the app
// doesn't crash if the native module isn't linked
// (e.g., Expo Go without custom dev client).

let RtcEngine: any = null;
let RtcRole: any = null;
let ChannelProfileType: any = null;
let AudioProfileType: any = null;
let AudioScenarioType: any = null;
let sdkAvailable = false;

try {
  const agora = require('react-native-agora');
  RtcEngine = agora.RtcEngine;
  RtcRole = agora.RtcRole;
  ChannelProfileType = agora.ChannelProfileType;
  AudioProfileType = agora.AudioProfileType;
  AudioScenarioType = agora.AudioScenarioType;
  sdkAvailable = !!RtcEngine;
} catch (e) {
  console.warn('[AGORA] Native SDK not available. Calls will use phone dialer fallback.');
  console.warn('[AGORA] To enable in-app calls, run: npx expo prebuild && npx expo run:android');
  sdkAvailable = false;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useAgoraCall(): UseAgoraCallReturn {
  const [callState, setCallState] = useState<AgoraCallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [hasRemoteUser, setHasRemoteUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<any>(null);
  const callInfoRef = useRef<AgoraCallInfo | null>(null);

  // ------------------------------------------
  // Request Android microphone permission
  // ------------------------------------------
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Smart Ride needs access to your microphone for voice calls.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('[AGORA] Permission request error:', err);
        return false;
      }
    }
    // iOS permission is requested automatically by Agora SDK
    return true;
  }, []);

  // ------------------------------------------
  // Initialize Agora RtcEngine
  // ------------------------------------------
  const initializeEngine = useCallback(async (): Promise<any> => {
    if (!sdkAvailable || !RtcEngine) {
      console.warn('[AGORA] SDK not available, cannot initialize engine');
      return null;
    }

    const appId = getAgoraAppId();
    if (!appId) {
      console.warn('[AGORA] App ID not configured');
      return null;
    }

    try {
      // Destroy any existing engine
      if (engineRef.current) {
        await engineRef.current.destroy();
        engineRef.current = null;
      }

      const engine = await RtcEngine.create(appId);
      engineRef.current = engine;

      // Enable audio
      await engine.enableAudio();

      // Set channel profile to communication (1:1 or group voice call)
      if (ChannelProfileType) {
        await engine.setChannelProfile(ChannelProfileType.Communication);
      }

      // Set audio profile for speech
      if (AudioProfileType && AudioScenarioType) {
        await engine.setAudioProfile(
          AudioProfileType.SpeechStandard,
          AudioScenarioType.ChatRoom
        );
      }

      // Set up event listeners
      engine.addListener('onJoinChannelSuccess', (_connection: any, elapsed: number) => {
        console.log('[AGORA] Joined channel successfully, elapsed:', elapsed);
        setCallState('connected');
      });

      engine.addListener('onUserJoined', (_connection: any, uid: number, elapsed: number) => {
        console.log('[AGORA] Remote user joined, uid:', uid, 'elapsed:', elapsed);
        setHasRemoteUser(true);
      });

      engine.addListener('onUserOffline', (_connection: any, uid: number, reason: any) => {
        console.log('[AGORA] Remote user offline, uid:', uid, 'reason:', reason);
        setHasRemoteUser(false);
      });

      engine.addListener('onLeaveChannel', (_connection: any, stats: any) => {
        console.log('[AGORA] Left channel, duration:', stats?.duration);
        setCallState('ended');
        setHasRemoteUser(false);
      });

      engine.addListener('onConnectionStateChanged', (_connection: any, state: number, reason: number) => {
        console.log('[AGORA] Connection state changed:', state, 'reason:', reason);
        // State 3 = RECONNECTING
        if (state === 3) {
          setCallState('reconnecting');
        }
        // State 5 = CONNECTED after reconnecting
        if (state === 5) {
          setCallState('connected');
        }
      });

      engine.addListener('onError', (_err: any, message: string) => {
        console.error('[AGORA] Error:', _err, message);
        setError(`Agora error: ${message || String(_err)}`);
      });

      console.log('[AGORA] Engine initialized successfully');
      return engine;
    } catch (err) {
      console.error('[AGORA] Failed to initialize engine:', err);
      setError('Failed to initialize call engine');
      return null;
    }
  }, []);

  // ------------------------------------------
  // Join a channel
  // ------------------------------------------
  const joinChannel = useCallback(async (channelId: string) => {
    setError(null);
    setCallState('joining');

    // Check if Agora SDK is available
    if (!sdkAvailable || !isAgoraConfigured()) {
      console.warn('[AGORA] SDK not available or not configured. Use phone fallback.');
      setError('In-app calling requires a custom dev client. Use phone dialer instead.');
      setCallState('idle');
      return;
    }

    // Request microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setError('Microphone permission is required for voice calls');
      setCallState('idle');
      return;
    }

    try {
      // Get token from our backend
      const tokenResponse = await api.getCallToken(channelId);
      if (!tokenResponse.success || !tokenResponse.data) {
        throw new Error(tokenResponse.error || 'Failed to get call token');
      }

      const { token, appId, uid } = tokenResponse.data;

      // Check if Agora is fully configured on the server
      if (tokenResponse.data.fallbackMode) {
        console.warn('[AGORA] Server is in fallback mode. Use phone dialer.');
        setError('Call server not fully configured. Use phone dialer instead.');
        setCallState('idle');
        return;
      }

      // Initialize engine
      const engine = await initializeEngine();
      if (!engine) {
        throw new Error('Failed to initialize call engine');
      }

      // Store call info
      callInfoRef.current = { channelId, token, uid, appId };

      // Join the Agora channel
      await engine.joinChannel(token, channelId, null, uid);
      console.log('[AGORA] Joining channel:', channelId, 'uid:', uid);

    } catch (err: any) {
      console.error('[AGORA] Failed to join channel:', err);
      setError(err.message || 'Failed to join call');
      setCallState('idle');
    }
  }, [initializeEngine, requestMicrophonePermission]);

  // ------------------------------------------
  // Leave the current channel
  // ------------------------------------------
  const leaveChannel = useCallback(async () => {
    try {
      if (engineRef.current) {
        await engineRef.current.leaveChannel();
        console.log('[AGORA] Left channel');
      }
    } catch (err) {
      console.error('[AGORA] Error leaving channel:', err);
    } finally {
      setCallState('ended');
      setHasRemoteUser(false);
      setIsMuted(false);
      setIsSpeakerOn(false);
      callInfoRef.current = null;
    }
  }, []);

  // ------------------------------------------
  // Toggle mute
  // ------------------------------------------
  const toggleMute = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const newMuted = !isMuted;
      await engineRef.current.muteLocalAudioStream(newMuted);
      setIsMuted(newMuted);
      console.log('[AGORA] Microphone', newMuted ? 'muted' : 'unmuted');
    } catch (err) {
      console.error('[AGORA] Mute toggle error:', err);
    }
  }, [isMuted]);

  // ------------------------------------------
  // Toggle speaker
  // ------------------------------------------
  const toggleSpeaker = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const newSpeaker = !isSpeakerOn;
      await engineRef.current.setEnableSpeakerphone(newSpeaker);
      setIsSpeakerOn(newSpeaker);
      console.log('[AGORA] Speaker', newSpeaker ? 'on' : 'off');
    } catch (err) {
      console.error('[AGORA] Speaker toggle error:', err);
    }
  }, [isSpeakerOn]);

  // ------------------------------------------
  // Switch to phone fallback
  // ------------------------------------------
  const switchToPhoneFallback = useCallback((): string | null => {
    // Leave the Agora channel first
    if (engineRef.current) {
      engineRef.current.leaveChannel().catch(() => {});
    }
    setCallState('idle');
    return null; // Caller should use Linking.openURL('tel:...')
  }, []);

  // ------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        console.log('[AGORA] Cleaning up engine on unmount');
        try {
          engineRef.current.leaveChannel().catch(() => {});
          engineRef.current.destroy().catch(() => {});
        } catch (err) {
          console.error('[AGORA] Cleanup error:', err);
        }
        engineRef.current = null;
      }
    };
  }, []);

  return {
    callState,
    isMuted,
    isSpeakerOn,
    hasRemoteUser,
    isSdkAvailable: sdkAvailable,
    error,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    switchToPhoneFallback,
  };
}

export default useAgoraCall;
