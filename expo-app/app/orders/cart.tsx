// ============================================
// SMART RIDE MOBILE - CART SCREEN
// ============================================
// Premium dark theme with vector icons
// ============================================

import { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { useLocationStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, PAYMENT_METHODS } from '@/src/constants';
import { PaymentMethod } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CartScreen() {
  const router = useRouter();
  const { address, latitude, longitude } = useLocationStore();

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
        merchantId: 'merchant-id',
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

  const getPaymentIcon = (methodId: string): 'phone' | 'dollar-sign' | 'credit-card' => {
    if (methodId === 'MTN_MOMO' || methodId === 'AIRTEL_MONEY') return 'phone';
    if (methodId === 'CASH') return 'dollar-sign';
    return 'credit-card';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size="md" color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
      </Animated.View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cart Items */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.card}>
          <Text style={styles.cardTitle}>Order Items</Text>
          
          {cartItems.map((item, index) => (
            <View key={item.id} style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  UGX {item.price.toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, -1)}
                  activeOpacity={0.8}
                >
                  <Icon name="minus" size="sm" color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity 
                  style={[styles.quantityButton, styles.quantityButtonActive]}
                  onPress={() => updateQuantity(item.id, 1)}
                  activeOpacity={0.8}
                >
                  <Icon name="plus" size="sm" color={COLORS.background} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {cartItems.length === 0 && (
            <View style={styles.emptyCart}>
              <Icon name="shopping-cart" size="lg" color={COLORS.textMuted} />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
            </View>
          )}
        </Animated.View>

        {/* Delivery Address */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <TouchableOpacity style={styles.addressRow} activeOpacity={0.8}>
            <View style={styles.addressIcon}>
              <Icon name="map-pin" size="sm" color={COLORS.primary} />
            </View>
            <Text style={styles.addressText} numberOfLines={2}>
              {address || 'Set delivery address'}
            </Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <View style={styles.instructionsInput}>
            <TextInput
              style={styles.instructionsText}
              placeholder="Add delivery instructions..."
              placeholderTextColor={COLORS.textMuted}
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              multiline
              numberOfLines={2}
            />
          </View>
        </Animated.View>

        {/* Payment Method */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          
          <View style={styles.paymentMethods}>
            {PAYMENT_METHODS.slice(0, 3).map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  paymentMethod === method.id && styles.paymentMethodActive
                ]}
                onPress={() => setPaymentMethod(method.id as PaymentMethod)}
                activeOpacity={0.8}
              >
                <Icon 
                  name={getPaymentIcon(method.id)} 
                  size="sm" 
                  color={paymentMethod === method.id ? COLORS.background : COLORS.text} 
                />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === method.id && styles.paymentMethodTextActive
                ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentMethod !== 'CASH' && (
            <View style={styles.phoneInput}>
              <Icon name="phone" size="md" color={COLORS.textMuted} />
              <TextInput
                style={styles.phoneInputText}
                placeholder="Enter phone number"
                placeholderTextColor={COLORS.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          )}
        </Animated.View>

        {/* Order Summary */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>UGX {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>UGX {deliveryFee.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>UGX {serviceFee.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>UGX {total.toLocaleString()}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            (isPlacingOrder || cartItems.length === 0) && styles.placeOrderButtonDisabled
          ]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || cartItems.length === 0}
          activeOpacity={0.8}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Icon name="check" size="md" color={COLORS.background} />
              <Text style={styles.placeOrderText}>
                Place Order • UGX {total.toLocaleString()}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  itemPrice: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quantityText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCartText: {
    color: COLORS.textMuted,
    marginTop: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  changeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  instructionsInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  instructionsText: {
    color: COLORS.text,
    fontSize: 14,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentMethodActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  paymentMethodTextActive: {
    color: COLORS.background,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  phoneInputText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  placeOrderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: COLORS.backgroundSurface,
  },
  placeOrderText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
