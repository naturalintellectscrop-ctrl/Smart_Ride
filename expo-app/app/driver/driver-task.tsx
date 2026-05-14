// ============================================
// SMART RIDE MOBILE - DRIVER TASK SCREEN
// ============================================

import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
// Conditional import for web compatibility
const MapView = Platform.OS === 'web' 
  ? require('@/src/mocks/react-native-maps').MapView 
  : require('react-native-maps').default;
const { Marker, Polyline } = Platform.OS === 'web' 
  ? require('@/src/mocks/react-native-maps') 
  : require('react-native-maps');
import * as Location from 'expo-location';
import { useTaskStore, useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/src/constants';
import { Task, TaskStatus } from '@/src/types';

const TASK_FLOW: Record<TaskStatus, TaskStatus | null> = {
  'CREATED': 'ASSIGNED',
  'MATCHING': 'ASSIGNED',
  'ASSIGNED': 'ACCEPTED',
  'ACCEPTED': 'ARRIVED',
  'ARRIVED': 'PICKED_UP',
  'PICKED_UP': 'IN_TRANSIT',
  'IN_TRANSIT': 'COMPLETED',
  'COMPLETED': null,
  'DELIVERED': null,
  'CANCELLED': null,
  'FAILED': null,
};

export default function DriverTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const { latitude, longitude } = useLocationStore();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (params.taskId) {
      loadTask(params.taskId);
      socketService.joinTaskRoom(params.taskId);
    }

    return () => {
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
      } else {
        Alert.alert('Error', 'Failed to load task details');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus: TaskStatus) => {
    if (!task) return;

    setIsUpdating(true);
    try {
      const response = await api.updateTaskStatus(task.id, newStatus);
      if (response.success && response.data) {
        setTask(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNextAction = () => {
    if (!task) return;

    const nextStatus = TASK_FLOW[task.status];
    if (nextStatus) {
      updateStatus(nextStatus);
    }
  };

  const handleCancelTask = () => {
    Alert.alert(
      'Cancel Task',
      'Are you sure you want to cancel this task?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!task) return;
            
            setIsUpdating(true);
            try {
              const response = await api.cancelTask(task.id, 'Cancelled by driver');
              if (response.success) {
                router.replace('/driver');
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel task');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel task');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    if (task?.client?.phone) {
      Linking.openURL(`tel:${task.client.phone}`);
    }
  };

  const openNavigation = (destLat: number, destLng: number) => {
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `maps:?daddr=${destLat},${destLng}`,
      android: `geo:?daddr=${destLat},${destLng}`,
    });
    Linking.openURL(url || `https://maps.google.com/?daddr=${destLat},${destLng}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-gray-500">Loading task details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">No task found</Text>
      </View>
    );
  }

  const statusColor = TASK_STATUS_COLORS[task.status] || COLORS.primary;
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const nextStatus = TASK_FLOW[task.status];

  // Button label based on current status
  const getButtonLabel = (): string => {
    switch (task.status) {
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'Navigate to Pickup';
      case 'ARRIVED':
        return 'Confirm Pickup';
      case 'PICKED_UP':
        return 'Start Trip';
      case 'IN_TRANSIT':
        return 'Complete Trip';
      default:
        return 'Update Status';
    }
  };

  const handleButtonPress = () => {
    switch (task.status) {
      case 'ASSIGNED':
      case 'ACCEPTED':
        if (task.pickupLatitude && task.pickupLongitude) {
          openNavigation(task.pickupLatitude, task.pickupLongitude);
        }
        break;
      case 'ARRIVED':
        updateStatus('PICKED_UP');
        break;
      case 'PICKED_UP':
        updateStatus('IN_TRANSIT');
        break;
      case 'IN_TRANSIT':
        updateStatus('COMPLETED');
        break;
      default:
        if (nextStatus) updateStatus(nextStatus);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Map */}
      <MapView
        className="flex-1"
        initialRegion={{
          latitude: task.pickupLatitude || 0.3476,
          longitude: task.pickupLongitude || 32.5825,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
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
      </MapView>

      {/* Bottom Card */}
      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg px-4 pt-4 pb-8">
        {/* Status Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text 
              className="text-lg font-bold"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </Text>
            <Text className="text-gray-500 text-sm">{task.taskNumber}</Text>
          </View>
          <View 
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <Text className="text-sm font-medium" style={{ color: statusColor }}>
              {task.taskType.includes('BODA') ? '🏍️ Boda' : '🚗 Car'}
            </Text>
          </View>
        </View>

        {/* Client Info */}
        {task.client && (
          <View className="flex-row items-center bg-gray-50 rounded-xl p-4 mb-4">
            <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center mr-3">
              <Text className="text-xl">👤</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900">{task.client.name}</Text>
              <Text className="text-gray-500">{task.client.phone}</Text>
            </View>
            <TouchableOpacity 
              className="w-10 h-10 bg-secondary-500 rounded-full items-center justify-center"
              onPress={handleCallClient}
            >
              <Text>📞</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Route Info */}
        <View className="mb-4">
          <View className="flex-row items-start mb-2">
            <View className="w-3 h-3 rounded-full bg-secondary-500 mt-1 mr-3" />
            <View className="flex-1">
              <Text className="text-gray-500 text-xs">Pickup</Text>
              <Text className="text-gray-900">{task.pickupAddress}</Text>
            </View>
          </View>
          <View className="flex-row items-start">
            <View className="w-3 h-3 rounded-full bg-primary-500 mt-1 mr-3" />
            <View className="flex-1">
              <Text className="text-gray-500 text-xs">Dropoff</Text>
              <Text className="text-gray-900">{task.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View className="flex-row justify-between items-center py-3 border-t border-gray-100 mb-4">
          <Text className="text-gray-500">Payment: {task.paymentMethod}</Text>
          <Text className="text-xl font-bold text-secondary-500">
            UGX {task.totalAmount.toLocaleString()}
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-red-50 rounded-xl py-4"
            onPress={handleCancelTask}
            disabled={isUpdating || task.status === 'COMPLETED'}
          >
            <Text className="text-red-500 text-center font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-xl py-4 ${
              isUpdating ? 'bg-primary-300' : 'bg-primary-500'
            }`}
            onPress={handleButtonPress}
            disabled={isUpdating || task.status === 'COMPLETED'}
          >
            {isUpdating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold">
                {getButtonLabel()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Completed Message */}
        {task.status === 'COMPLETED' && (
          <View className="mt-4 bg-secondary-50 rounded-xl p-4">
            <Text className="text-secondary-500 text-center font-semibold">
              ✅ Trip Completed Successfully!
            </Text>
            <TouchableOpacity 
              className="mt-3 bg-secondary-500 rounded-xl py-3"
              onPress={() => router.replace('/driver')}
            >
              <Text className="text-white text-center font-semibold">
                Go to Home
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
