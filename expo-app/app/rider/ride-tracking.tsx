// ============================================
// SMART RIDE MOBILE - RIDE TRACKING SCREEN
// FIXED: Added polling fallback for when socket fails
// ============================================

import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTaskStore, useAuthStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/src/constants';
import { Task, TaskStatus } from '@/src/types';

// Polling intervals (in ms)
const POLL_INTERVAL_FAST = 3000;  // 3 seconds for active rides
const POLL_INTERVAL_SLOW = 10000; // 10 seconds for searching/matching

export default function RideTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const { pendingTask, setCurrentTask, updateTaskStatus, clearPendingTask } = useTaskStore();
  const { user, accessToken } = useAuthStore();

  const [task, setTask] = useState<Task | null>(pendingTask);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
  } | null>(null);
  
  // Polling refs
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketConnectedRef = useRef(false);

  // POLLING FALLBACK: Fetch task status periodically
  const pollTaskStatus = async () => {
    if (!params.taskId) return;
    
    try {
      const response = await api.getTask(params.taskId);
      if (response.success && response.data) {
        const updatedTask = response.data;
        
        // Check if status changed
        setTask(prev => {
          if (prev && prev.status !== updatedTask.status) {
            // Status changed - update store
            updateTaskStatus(params.taskId, updatedTask.status);
            
            // Handle completion
            if (updatedTask.status === 'COMPLETED') {
              handleRideCompleted(updatedTask);
            }
          }
          return updatedTask;
        });
        
        // Update driver location if available
        if (updatedTask.rider?.currentLatitude && updatedTask.rider?.currentLongitude) {
          setDriverLocation({
            latitude: updatedTask.rider.currentLatitude,
            longitude: updatedTask.rider.currentLongitude,
          });
        }
      }
    } catch (error) {
      console.error('[RideTracking] Poll error:', error);
    }
  };

  // Handle ride completion - redirect to payment or rating
  const handleRideCompleted = (completedTask: Task) => {
    // Stop polling immediately
    stopPolling();
    
    // Clear pending task
    clearPendingTask();
    
    // Extract payment details
    const paymentDetails = (completedTask as any).paymentDetails || {
      fare: completedTask.totalAmount,
      currency: 'UGX',
      paymentMethod: completedTask.paymentMethod || 'CASH',
      paymentStatus: 'PENDING',
    };
    
    // Format payment method for display
    const paymentMethodLabel: Record<string, string> = {
      'CASH': '💵 Cash',
      'MTN_MOMO': '📱 MTN MoMo',
      'AIRTEL_MONEY': '📱 Airtel Money',
      'VISA': '💳 Visa',
      'MASTERCARD': '💳 Mastercard',
    };
    
    // Show completion alert with payment confirmation
    Alert.alert(
      '✅ Ride Completed!',
      `Total Fare: ${paymentDetails.currency} ${paymentDetails.fare?.toLocaleString() || 'N/A'}\n\nPayment Method: ${paymentMethodLabel[paymentDetails.paymentMethod] || paymentDetails.paymentMethod}\n\n${paymentDetails.paymentMethod === 'CASH' ? 'Please pay the driver in cash.' : 'Payment will be processed automatically.'}`,
      [
        {
          text: 'Rate Driver',
          onPress: () => router.replace('/(tabs)'),
        },
        {
          text: 'Done',
          style: 'default',
          onPress: () => router.replace('/(tabs)'),
        },
      ],
      { cancelable: false }
    );
  };

  // Start polling
  const startPolling = (interval: number = POLL_INTERVAL_FAST) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(pollTaskStatus, interval);
    console.log('[RideTracking] Started polling with interval:', interval);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (params.taskId && !pendingTask) {
      loadTask(params.taskId);
    } else if (pendingTask) {
      setTask(pendingTask);
      setIsLoading(false);
    }

    // CRITICAL: ALWAYS start polling for status updates
    // Polling is the PRIMARY mechanism, socket is secondary
    startPolling();
    console.log('[RideTracking] Polling started as primary update mechanism');

    // ATTEMPT SOCKET CONNECTION (secondary, optional)
    const initSocket = async () => {
      try {
        await socketService.connect();
        socketConnectedRef.current = socketService.isSocketConnected();
        
        if (socketConnectedRef.current && params.taskId) {
          socketService.joinTaskRoom(params.taskId);
          console.log('[RideTracking] Socket connected as secondary mechanism');
        }
      } catch (error) {
        console.log('[RideTracking] Socket not available, polling only');
      }
    };
    
    initSocket();

    // Listen for task status updates (if socket connects - secondary)
    const unsubscribeStatus = socketService.on('task:status', (data: { taskId: string; status: string }) => {
      if (data.taskId === params.taskId) {
        updateTaskStatus(data.taskId, data.status);
        setTask(prev => prev ? { ...prev, status: data.status as TaskStatus } : null);
        
        if (data.status === 'COMPLETED') {
          // Fetch full task and handle completion
          pollTaskStatus();
        }
      }
    });

    // Listen for driver location updates (if socket connects - secondary)
    const unsubscribeLocation = socketService.on('location:update', (data: { riderId: string; latitude: number; longitude: number; heading?: number }) => {
      if (task?.riderId === data.riderId) {
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
        });
      }
    });

    // Listen for task cancellation (if socket connects - secondary)
    const unsubscribeCancel = socketService.on('task:cancelled', (data: { taskId: string; reason: string }) => {
      if (data.taskId === params.taskId) {
        stopPolling();
        clearPendingTask();
        Alert.alert('Ride Cancelled', data.reason);
        router.replace('/(tabs)');
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeLocation();
      unsubscribeCancel();
      stopPolling();
      if (params.taskId) {
        socketService.leaveTaskRoom(params.taskId);
      }
    };
  }, [params.taskId]);

  const loadTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getTask(taskId);
      if (response.success && response.data) {
        setTask(response.data);
        setCurrentTask(response.data);
      } else {
        Alert.alert('Error', 'Failed to load ride details');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!task) return;
            
            setIsCancelling(true);
            try {
              const response = await api.cancelTask(task.id, 'Cancelled by user');
              if (response.success) {
                router.replace('/(tabs)');
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel ride');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleCallDriver = () => {
    if (task?.rider?.phone) {
      Linking.openURL(`tel:${task.rider.phone}`);
    }
  };

  const handleSOS = async () => {
    Alert.alert(
      'SOS Emergency',
      'This will alert our emergency response team. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SOS',
          style: 'destructive',
          onPress: async () => {
            if (task?.pickupLatitude && task?.pickupLongitude) {
              await api.triggerSOS({
                latitude: task.pickupLatitude,
                longitude: task.pickupLongitude,
                taskId: task.id,
                emergencyType: 'RIDER_SOS',
              });
              Alert.alert('SOS Sent', 'Emergency team has been notified');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-gray-500">Loading ride details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">No active ride found</Text>
        <TouchableOpacity 
          className="mt-4 bg-primary-500 rounded-xl px-6 py-3"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text className="text-white font-semibold">Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = TASK_STATUS_COLORS[task.status] || COLORS.primary;
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;

  // Map region
  const region = {
    latitude: task.pickupLatitude || 0.3476,
    longitude: task.pickupLongitude || 32.5825,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View className="flex-1 bg-white">
      {/* Map */}
      <MapView
        className="flex-1"
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Pickup Marker */}
        <Marker
          coordinate={{
            latitude: task.pickupLatitude || 0.3476,
            longitude: task.pickupLongitude || 32.5825,
          }}
          title="Pickup"
          pinColor={COLORS.secondary}
        />

        {/* Dropoff Marker */}
        {task.dropoffLatitude && task.dropoffLongitude && (
          <Marker
            coordinate={{
              latitude: task.dropoffLatitude,
              longitude: task.dropoffLongitude,
            }}
            title="Dropoff"
            pinColor={COLORS.primary}
          />
        )}

        {/* Driver Location */}
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title="Driver"
          >
            <View className="w-10 h-10 bg-primary-500 rounded-full items-center justify-center">
              <Text className="text-xl">{task.taskType.includes('BODA') ? '🏍️' : '🚗'}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Status Card */}
      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg px-4 pt-4 pb-8">
        {/* Status */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text 
              className="text-lg font-bold"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </Text>
            <Text className="text-gray-500 text-sm">
              {task.taskNumber}
            </Text>
          </View>
          <View 
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <ActivityIndicator size="small" color={statusColor} />
          </View>
        </View>

        {/* Driver Info */}
        {task.rider && (
          <View className="flex-row items-center bg-gray-50 rounded-xl p-4 mb-4">
            <View className="w-14 h-14 bg-gray-200 rounded-full items-center justify-center mr-3">
              <Text className="text-2xl">👤</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900">{task.rider.fullName}</Text>
              <View className="flex-row items-center">
                <Text className="text-yellow-500 mr-1">⭐</Text>
                <Text className="text-gray-600">{task.rider.rating.toFixed(1)}</Text>
                <Text className="text-gray-400 mx-2">•</Text>
                <Text className="text-gray-600">{task.rider.totalTrips} trips</Text>
              </View>
            </View>
            <TouchableOpacity 
              className="w-10 h-10 bg-secondary-500 rounded-full items-center justify-center"
              onPress={handleCallDriver}
            >
              <Text>📞</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Route Info */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-2 h-2 rounded-full bg-secondary-500 mr-2" />
              <Text className="text-gray-500 text-xs">Pickup</Text>
            </View>
            <Text className="text-gray-900" numberOfLines={1}>{task.pickupAddress}</Text>
          </View>
        </View>
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-2 h-2 rounded-full bg-primary-500 mr-2" />
              <Text className="text-gray-500 text-xs">Dropoff</Text>
            </View>
            <Text className="text-gray-900" numberOfLines={1}>{task.dropoffAddress}</Text>
          </View>
        </View>

        {/* Fare */}
        <View className="flex-row items-center justify-between py-3 border-t border-gray-100">
          <Text className="text-gray-500">Estimated Fare</Text>
          <Text className="text-xl font-bold text-primary-500">
            UGX {task.totalAmount.toLocaleString()}
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-red-50 rounded-xl py-4 flex-row items-center justify-center"
            onPress={handleCancel}
            disabled={isCancelling || task.status === 'COMPLETED'}
          >
            <Text className="text-red-500 font-semibold">
              {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-500 rounded-xl py-4 flex-row items-center justify-center"
            onPress={handleSOS}
          >
            <Text className="text-white font-semibold">SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
