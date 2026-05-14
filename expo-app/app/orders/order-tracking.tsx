// ============================================
// SMART RIDE MOBILE - ORDER TRACKING SCREEN
// ============================================

import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS } from '@/src/constants';
import { Order } from '@/src/types';

const ORDER_STATUS_FLOW = [
  { status: 'ORDER_CREATED', label: 'Order Placed', icon: '📝' },
  { status: 'MERCHANT_ACCEPTED', label: 'Confirmed', icon: '✅' },
  { status: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
  { status: 'READY_FOR_PICKUP', label: 'Ready', icon: '📦' },
  { status: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: '🚗' },
  { status: 'DELIVERED', label: 'Delivered', icon: '🎉' },
];

export default function OrderTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const { address } = useLocationStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.orderId) {
      loadOrder(params.orderId);
    }
  }, [params.orderId]);

  useEffect(() => {
    // Listen for order status updates
    const unsubscribe = socketService.on('order:status', (data: { orderId: string; status: string }) => {
      if (data.orderId === params.orderId && order) {
        setOrder({ ...order, status: data.status as any });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [params.orderId, order]);

  const loadOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        Alert.alert('Error', 'Failed to load order details');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallMerchant = () => {
    if (order?.merchant?.phone) {
      Linking.openURL(`tel:${order.merchant.phone}`);
    }
  };

  const handleCallDriver = () => {
    // Would get driver phone from task
    Alert.alert('Coming Soon', 'Driver calling will be available soon');
  };

  const getCurrentStep = () => {
    if (!order) return 0;
    const index = ORDER_STATUS_FLOW.findIndex(s => s.status === order.status);
    return index >= 0 ? index : 0;
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-gray-500">Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">No order found</Text>
      </View>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <View className="flex-1 bg-white">
      {/* Map */}
      {order.deliveryLatitude && order.deliveryLongitude && (
        <MapView
          className="h-48"
          initialRegion={{
            latitude: order.deliveryLatitude,
            longitude: order.deliveryLongitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
        >
          <Marker
            coordinate={{
              latitude: order.deliveryLatitude,
              longitude: order.deliveryLongitude,
            }}
            title="Delivery Location"
            pinColor={COLORS.primary}
          />
        </MapView>
      )}

      <ScrollView className="flex-1">
        {/* Order Status */}
        <View className="px-4 pt-4">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            Order #{order.orderNumber}
          </Text>

          {/* Progress Steps */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-4">
            {ORDER_STATUS_FLOW.map((step, index) => {
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;

              return (
                <View key={step.status} className="flex-row items-start">
                  {/* Line */}
                  {index > 0 && (
                    <View 
                      className={`w-0.5 h-6 ml-4 -mb-2 ${
                        index <= currentStep ? 'bg-secondary-500' : 'bg-gray-200'
                      }`}
                    />
                  )}

                  {/* Icon & Content */}
                  <View className="flex-row items-center flex-1 py-2">
                    <View 
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isActive ? 'bg-secondary-500' : 'bg-gray-200'
                      }`}
                    >
                      <Text className="text-sm">{step.icon}</Text>
                    </View>
                    <Text 
                      className={`ml-3 flex-1 ${
                        isCurrent ? 'font-bold text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <ActivityIndicator size="small" color={COLORS.secondary} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Merchant Info */}
          {order.merchant && (
            <View className="bg-gray-50 rounded-2xl p-4 mb-4">
              <Text className="text-gray-500 text-sm mb-2">Restaurant</Text>
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-gray-200 rounded-xl items-center justify-center mr-3">
                  <Text className="text-2xl">🍽️</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">{order.merchant.name}</Text>
                  <Text className="text-gray-500 text-sm">{order.merchant.address}</Text>
                </View>
                <TouchableOpacity 
                  className="w-10 h-10 bg-secondary-50 rounded-full items-center justify-center"
                  onPress={handleCallMerchant}
                >
                  <Text>📞</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Order Items */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-4">
            <Text className="text-gray-500 text-sm mb-2">Order Items</Text>
            {order.items.map((item, index) => (
              <View key={index} className="flex-row justify-between py-2">
                <Text className="text-gray-900">
                  {item.quantity}x {item.name}
                </Text>
                <Text className="text-gray-600">
                  UGX {item.totalPrice.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-4">
            <Text className="text-gray-500 text-sm mb-2">Delivery Address</Text>
            <View className="flex-row items-start">
              <Text className="mr-2">📍</Text>
              <Text className="text-gray-900 flex-1">{order.deliveryAddress}</Text>
            </View>
          </View>

          {/* Payment Summary */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-4">
            <Text className="text-gray-500 text-sm mb-2">Payment Summary</Text>
            <View className="flex-row justify-between py-1">
              <Text className="text-gray-500">Subtotal</Text>
              <Text className="text-gray-900">UGX {order.subtotal.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-gray-500">Delivery</Text>
              <Text className="text-gray-900">UGX {order.deliveryFee.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-t border-gray-200 mt-2">
              <Text className="font-bold text-gray-900">Total</Text>
              <Text className="font-bold text-primary-500">
                UGX {order.totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="bg-white px-4 py-4 border-t border-gray-100">
        {order.status === 'DELIVERED' ? (
          <TouchableOpacity
            className="bg-secondary-500 rounded-xl py-4"
            onPress={() => router.replace('/(tabs)')}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Done
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-red-50 rounded-xl py-4"
              onPress={() => Alert.alert('Coming Soon', 'Order cancellation will be available soon')}
            >
              <Text className="text-red-500 text-center font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary-500 rounded-xl py-4"
              onPress={handleCallDriver}
            >
              <Text className="text-white text-center font-semibold">Contact Support</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
