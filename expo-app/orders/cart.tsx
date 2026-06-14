// ============================================
// SMART RIDE MOBILE - CART SCREEN
// ============================================

import { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocationStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, PAYMENT_METHODS } from '@/src/constants';
import { PaymentMethod } from '@/src/types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CartScreen() {
  const router = useRouter();
  const { address, latitude, longitude } = useLocationStore();

  // Mock cart items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: '1', name: 'Rolex', price: 5000, quantity: 2 },
    { id: '2', name: 'Chapati', price: 1000, quantity: 3 },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 3000;
  const serviceFee = 500;
  const total = subtotal + deliveryFee + serviceFee;

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    if (!address) {
      Alert.alert('Error', 'Please set a delivery address');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const response = await api.placeOrder({
        merchantId: 'merchant-id', // Would come from actual cart state
        orderType: 'FOOD_DELIVERY',
        items: cartItems.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
        deliveryAddress: address,
        deliveryLatitude: latitude,
        deliveryLongitude: longitude,
        paymentMethod,
      });

      if (response.success && response.data) {
        router.replace(`/orders/order-tracking?orderId=${response.data.id}`);
      } else {
        Alert.alert('Error', response.error || 'Failed to place order');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Text className="text-gray-600">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Your Cart</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Cart Items */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-900 mb-4">Order Items</Text>
          
          {cartItems.map((item) => (
            <View key={item.id} className="flex-row items-center py-3 border-b border-gray-100">
              <View className="flex-1">
                <Text className="text-gray-900 font-medium">{item.name}</Text>
                <Text className="text-gray-500 text-sm">
                  UGX {item.price.toLocaleString()}
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <TouchableOpacity 
                  className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  onPress={() => updateQuantity(item.id, -1)}
                >
                  <Text className="text-gray-600">-</Text>
                </TouchableOpacity>
                <Text className="w-8 text-center font-medium">{item.quantity}</Text>
                <TouchableOpacity 
                  className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center"
                  onPress={() => updateQuantity(item.id, 1)}
                >
                  <Text className="text-primary-500">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {cartItems.length === 0 && (
            <Text className="text-gray-400 text-center py-4">Your cart is empty</Text>
          )}
        </View>

        {/* Delivery Address */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Delivery Address</Text>
          <TouchableOpacity className="flex-row items-center bg-gray-50 rounded-xl p-3">
            <Text className="mr-3">📍</Text>
            <Text className="flex-1 text-gray-600" numberOfLines={2}>
              {address || 'Set delivery address'}
            </Text>
            <Text className="text-primary-500">Change</Text>
          </TouchableOpacity>

          <TextInput
            className="bg-gray-50 rounded-xl px-4 py-3 mt-3"
            placeholder="Add delivery instructions..."
            placeholderTextColor="#9CA3AF"
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Payment Method */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Payment Method</Text>
          
          <View className="flex-row flex-wrap gap-2">
            {PAYMENT_METHODS.slice(0, 3).map((method) => (
              <TouchableOpacity
                key={method.id}
                className={`flex-row items-center px-4 py-3 rounded-xl border ${
                  paymentMethod === method.id 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200'
                }`}
                onPress={() => setPaymentMethod(method.id as PaymentMethod)}
              >
                <Text className="mr-2">
                  {method.icon === 'phone' ? '📱' : method.icon === 'banknote' ? '💵' : '💳'}
                </Text>
                <Text className={paymentMethod === method.id ? 'text-primary-500 font-medium' : 'text-gray-700'}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentMethod !== 'CASH' && (
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 mt-3"
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          )}
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Order Summary</Text>
          
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">Subtotal</Text>
            <Text className="text-gray-900">UGX {subtotal.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">Delivery Fee</Text>
            <Text className="text-gray-900">UGX {deliveryFee.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">Service Fee</Text>
            <Text className="text-gray-900">UGX {serviceFee.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between py-3 border-t border-gray-100 mt-2">
            <Text className="font-bold text-gray-900">Total</Text>
            <Text className="font-bold text-primary-500 text-lg">
              UGX {total.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View className="bg-white px-4 py-4 border-t border-gray-100">
        <TouchableOpacity
          className={`rounded-xl py-4 ${isPlacingOrder ? 'bg-primary-300' : 'bg-primary-500'}`}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || cartItems.length === 0}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center text-lg font-semibold">
              Place Order • UGX {total.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
