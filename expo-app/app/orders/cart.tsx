// ============================================
// SMART RIDE MOBILE - CART SCREEN
// Stitch Design System Applied
// FIXED: Connected to cartStore instead of mock data
// ============================================

import { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { useLocationStore, useCartStore, useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { PAYMENT_METHODS, PAYMENT_METHOD_MAP, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { PaymentMethod } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

export default function CartScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { address, latitude, longitude, setAddress } = useLocationStore();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, merchantId, merchantName } = useCartStore();
  const { user } = useAuthStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState(address || '');

  const deliveryFee = 3000;
  const serviceFee = 500;
  const total = totalPrice + deliveryFee + serviceFee;

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = items.find(i => i.productId === productId);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        removeItem(productId);
      } else {
        updateQuantity(productId, newQuantity);
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please log in to place an order');
      return;
    }

    if (!merchantId) {
      Alert.alert('Error', 'No merchant selected. Please add items from a store.');
      return;
    }

    if (!address) {
      Alert.alert('Error', 'Please set a delivery address');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const response = await api.placeOrder({
        clientId: user?.id,
        merchantId,
        orderType: 'FOOD_DELIVERY',
        items: items.map(item => ({
          menuItemId: item.productId,
          quantity: item.quantity,
          itemName: item.name,
          unitPrice: item.price,
        })),
        subtotal: totalPrice,
        deliveryFee,
        serviceFee,
        totalAmount: total,
        deliveryAddress: address,
        deliveryLatitude: latitude,
        deliveryLongitude: longitude,
        paymentMethod: PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod,
        deliveryInstructions,
        ...(phoneNumber && paymentMethod !== 'CASH' ? { recipientPhone: phoneNumber } : {}),
      });

      if (response.success && response.data) {
        try {
          await api.confirmOrderPayment(response.data.id);
        } catch {
          // Non-blocking - order is already created, task auto-created by server
        }
        clearCart();
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Merchant Info */}
        {merchantName && (
          <View style={styles.card}>
            <Text style={styles.merchantLabel}>Ordering from</Text>
            <Text style={styles.merchantName}>{merchantName}</Text>
          </View>
        )}

        {/* Cart Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items</Text>
          
          {items.map((item) => (
            <View key={item.productId} style={styles.cartItemRow}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>
                  UGX {item.price.toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.quantityRow}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.productId, -1)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{item.quantity}</Text>
                <TouchableOpacity 
                  style={[styles.quantityButton, styles.quantityButtonPrimary]}
                  onPress={() => handleQuantityChange(item.productId, 1)}
                >
                  <Text style={styles.quantityButtonPrimaryText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {items.length === 0 && (
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => {
              setTempAddress(address || '');
              setIsEditingAddress(true);
            }}
          >
            <Ionicons name="location-outline" size={16} color={COLORS.primary} style={{ marginRight: SPACING.md - 4 }} />
            <Text style={styles.addressText} numberOfLines={2}>
              {address || 'Set delivery address'}
            </Text>
            <Text style={styles.addressChange}>{isEditingAddress ? 'Cancel' : 'Change'}</Text>
          </TouchableOpacity>

          {isEditingAddress && (
            <View style={styles.addressEditContainer}>
              <TextInput
                style={styles.addressEditInput}
                placeholder="Enter your delivery address"
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={tempAddress}
                onChangeText={setTempAddress}
                multiline
                numberOfLines={3}
                autoFocus
              />
              <View style={styles.addressEditActions}>
                <TouchableOpacity
                  style={[styles.addressEditBtn, styles.addressEditBtnSecondary]}
                  onPress={() => setIsEditingAddress(false)}
                >
                  <Text style={styles.addressEditBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addressEditBtn, styles.addressEditBtnPrimary]}
                  onPress={() => {
                    const trimmed = tempAddress.trim();
                    if (!trimmed) {
                      Alert.alert('Error', 'Please enter a valid address');
                      return;
                    }
                    setAddress(trimmed);
                    setIsEditingAddress(false);
                  }}
                >
                  <Text style={styles.addressEditBtnPrimaryText}>Save Address</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TextInput
            style={styles.instructionsInput}
            placeholder="Add delivery instructions..."
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          
          <View style={styles.paymentMethodsRow}>
            {PAYMENT_METHODS.slice(0, 3).map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === method.id && styles.paymentMethodCardSelected,
                ]}
                onPress={() => setPaymentMethod(method.id as PaymentMethod)}
              >
                <Text style={styles.paymentMethodIcon}>
                  <Ionicons name={method.icon === 'phone' ? 'phone-portrait-outline' : method.icon === 'banknote' ? 'cash-outline' : 'card-outline'} size={16} color={paymentMethod === method.id ? COLORS.primary : COLORS.onSurfaceVariant} style={{ marginRight: SPACING.sm }} />
                </Text>
                <Text style={[
                  styles.paymentMethodLabel,
                  paymentMethod === method.id && styles.paymentMethodLabelSelected,
                ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentMethod !== 'CASH' && (
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter phone number"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>UGX {totalPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>UGX {deliveryFee.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>UGX {serviceFee.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>
              UGX {total.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isPlacingOrder && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || items.length === 0}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color={COLORS.onPrimary} />
          ) : (
            <Text style={styles.placeOrderButtonText}>
              Place Order • UGX {total.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingTop: 48,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md - 4,
  },
  backIcon: {
    color: COLORS.onSurfaceVariant,
    fontSize: 18,
  },
  headerTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  merchantLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginBottom: SPACING.xs,
  },
  merchantName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md - 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
  },
  cartItemPrice: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '500',
  },
  quantityButtonPrimary: {
    backgroundColor: `${COLORS.primary}15`,
  },
  quantityButtonPrimaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  quantityValue: {
    width: 32,
    textAlign: 'center',
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
  },
  emptyCartText: {
    color: COLORS.outlineVariant,
    textAlign: 'center',
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.bodyMd,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 4,
  },
  addressIcon: {
    marginRight: SPACING.md - 4,
  },
  addressText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  addressChange: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
  },
  addressEditContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
  },
  addressEditInput: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    minHeight: 64,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  addressEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addressEditBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  addressEditBtnSecondary: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  addressEditBtnSecondaryText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
  },
  addressEditBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  addressEditBtnPrimaryText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  instructionsInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 4,
    marginTop: SPACING.md - 4,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 4,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  paymentMethodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  paymentMethodIcon: {
    marginRight: SPACING.sm,
  },
  paymentMethodLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  paymentMethodLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  phoneInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 4,
    marginTop: SPACING.md - 4,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm - 2,
  },
  summaryLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  summaryValue: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    marginTop: SPACING.sm,
  },
  summaryTotalLabel: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodyLg,
    fontWeight: 'bold',
  },
  bottomBar: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  placeOrderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '600',
  },
});
