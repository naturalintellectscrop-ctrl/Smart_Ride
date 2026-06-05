'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Check,
  Package,
  Truck,
  Clock,
  ShoppingBag,
  Trash2,
  ChevronRight,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useCart, CartItem, CartType } from './cart-context';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '@/components/smart-ride/shared/payment-method-selector';

interface CheckoutScreenProps {
  cartType: CartType;
  onBack: () => void;
  onOrderComplete: () => void;
}

type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirm' | 'success' | 'error';

// Theme colors based on cart type
const themeColors: Record<CartType, { primary: string; gradient: string; light: string }> = {
  food: { primary: 'bg-orange-600', gradient: 'from-orange-500 to-red-500', light: 'bg-orange-100 text-orange-600' },
  grocery: { primary: 'bg-[#005f3a]', gradient: 'from-[#005f3a] to-[#0e7a4d]', light: 'bg-[#98f6be]/30 text-[#005f3a]' },
  health: { primary: 'bg-[#005f3a]', gradient: 'from-[#005f3a] to-[#0e7a4d]', light: 'bg-[#98f6be]/30 text-[#005f3a]' },
  shopping: { primary: 'bg-[#005f3a]', gradient: 'from-[#005f3a] to-[#0e7a4d]', light: 'bg-[#98f6be]/30 text-[#005f3a]' },
};

const SERVICE_FEE = 1000;

// Map PaymentMethod selector enum to API payment method enum
function mapPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case 'MTN_MOMO': return 'MTN_MOMO';
    case 'AIRTEL_MONEY': return 'AIRTEL_MONEY';
    case 'VISA': return 'VISA';
    case 'MASTERCARD': return 'MASTERCARD';
    case 'CASH': return 'CASH';
    default: return 'CASH';
  }
}

export function CheckoutScreen({ cartType, onBack, onOrderComplete }: CheckoutScreenProps) {
  const { getCartByType, removeItem, updateQuantity, clearCart, getGrandTotal } = useCart();
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  const cart = getCartByType(cartType);
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const grandTotal = getGrandTotal(cartType);
  const theme = themeColors[cartType];

  const handleDeleteItem = (itemId: string) => {
    removeItem(itemId, cartType);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    updateQuantity(itemId, newQuantity, cartType);
  };

  // Get auth headers for API calls
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  // REAL ORDER CREATION via /api/orders
  const handlePlaceOrder = useCallback(async () => {
    if (!cart.merchantId) {
      setErrorMessage('No merchant selected. Please go back and select a store.');
      setStep('error');
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMessage('Please enter a delivery address.');
      setStep('error');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Get the authenticated user's ID
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('smart_ride_user') : null;
      const userId = storedUser ? JSON.parse(storedUser).id : '';

      const orderPayload = {
        clientId: userId, // Will be verified server-side from auth token
        merchantId: cart.merchantId,
        orderType: cart.orderType || (cartType === 'grocery' || cartType === 'shopping' ? 'SHOPPING' : 'FOOD_DELIVERY'),
        items: cart.items.map(item => ({
          menuItemId: item.menuItemId || undefined,
          itemName: item.name,
          itemDescription: item.description || undefined,
          quantity: item.quantity,
          unitPrice: item.price,
          specialInstructions: undefined,
        })),
        subtotal: total,
        deliveryFee: cart.deliveryFee,
        serviceFee: SERVICE_FEE,
        totalAmount: grandTotal + SERVICE_FEE,
        paymentMethod: mapPaymentMethod(paymentMethod),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLatitude: undefined,
        deliveryLongitude: undefined,
        deliveryInstructions: undefined,
        recipientName: undefined,
        recipientPhone: undefined,
      };

      // Step 1: Create the order (requires auth)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      const orderId = data.data.id;
      const orderNumber = data.data.orderNumber;

      // Step 2: Confirm payment - this notifies the merchant and creates KOT
      try {
        const confirmResponse = await fetch(`/api/orders/${orderId}?action=confirm-payment`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            paymentReference: `PAY-${Date.now()}`,
          }),
        });

        if (!confirmResponse.ok) {
          const confirmData = await confirmResponse.json();
          console.error('[Checkout] Payment confirmation failed (non-blocking):', confirmData.error);
          // Don't fail the whole flow - order is already created
        }
      } catch (confirmErr) {
        console.error('[Checkout] Payment confirmation error (non-blocking):', confirmErr);
        // Don't fail the whole flow - order is already created
      }

      setCreatedOrder({
        id: orderId,
        orderNumber,
      });

      setStep('success');
    } catch (err: any) {
      console.error('[Checkout] Order creation failed:', err);
      setErrorMessage(err.message || 'Failed to place order. Please try again.');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [cart, cartType, deliveryAddress, getAuthHeaders, grandTotal, paymentMethod, total]);

  const handleContinue = () => {
    if (step === 'cart' && cart.items.length > 0) {
      setStep('address');
    } else if (step === 'address' && deliveryAddress.trim()) {
      setStep('payment');
    } else if (step === 'payment') {
      setStep('confirm');
    }
  };

  // Error Screen
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#191c1d] mb-2">Order Failed</h1>
          <p className="text-[#6f7a71] mb-6">{errorMessage || 'Something went wrong'}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => setStep('confirm')}
              variant="outline"
              className="border-[#bec9bf]/40 text-[#191c1d]"
            >
              Try Again
            </Button>
            <Button
              onClick={onBack}
              className="bg-gradient-to-r from-[#005f3a] to-[#0e7a4d] text-white font-semibold"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-[#005f3a] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-[#191c1d]" />
          </div>
          <h1 className="text-2xl font-bold text-[#191c1d] mb-2">Order Placed!</h1>
          <p className="text-[#6f7a71] mb-2">Your order has been placed successfully</p>
          {createdOrder && (
            <p className="text-[#6f7a71] text-sm mb-8">Order: {createdOrder.orderNumber}</p>
          )}

          <div className="bg-white rounded-2xl p-4 mb-6 max-w-xs mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#f3f4f5] rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-[#005f3a]" />
              </div>
              <div className="text-left">
                <p className="text-[#6f7a71] text-sm">Next Step</p>
                <p className="text-[#191c1d] font-semibold">Awaiting merchant confirmation</p>
              </div>
            </div>
          </div>

          <p className="text-[#6f7a71] text-xs mb-6">
            You will receive notifications as your order progresses
          </p>

          <Button
            onClick={() => {
              clearCart(cartType);
              onOrderComplete();
            }}
            className="w-full bg-gradient-to-r from-[#005f3a] to-[#0e7a4d] text-white font-semibold py-4 rounded-xl"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Confirmation Screen
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] pb-32">
        <header className="sticky top-0 z-40 bg-white border-b border-[#bec9bf]/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('payment')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[#f3f4f5] active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
            </button>
            <h1 className="text-lg font-semibold text-[#191c1d]">Confirm Order</h1>
          </div>
        </header>

        <div className="px-4 pt-4">
          {/* Order Summary */}
          <Card className="bg-white border-[#bec9bf]/30 mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#191c1d] mb-3">Order Summary</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f3f4f5] rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-[#6f7a71]" />
                      </div>
                      <div>
                        <p className="text-[#191c1d] text-sm font-medium">{item.name}</p>
                        <p className="text-[#6f7a71] text-xs">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-[#191c1d] font-medium">UGX {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Merchant Info */}
          {cart.merchantName && (
            <Card className="bg-white border-[#bec9bf]/30 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Truck className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#6f7a71] text-xs">Store</p>
                    <p className="text-[#191c1d] font-medium">{cart.merchantName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          <Card className="bg-white border-[#bec9bf]/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[#6f7a71] text-xs">Delivery Address</p>
                  <p className="text-[#191c1d] font-medium">{deliveryAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="bg-white border-[#bec9bf]/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[#6f7a71] text-xs">Payment Method</p>
                  <p className="text-[#191c1d] font-medium">{paymentMethodLabels[paymentMethod]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card className="bg-white border-[#bec9bf]/30">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#191c1d] mb-3">Price Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-[#6f7a71]">
                  <span>Subtotal</span>
                  <span>UGX {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#6f7a71]">
                  <span>Delivery Fee</span>
                  <span>UGX {cart.deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#6f7a71]">
                  <span>Service Fee</span>
                  <span>UGX {SERVICE_FEE.toLocaleString()}</span>
                </div>
                <div className="border-t border-[#bec9bf]/30 pt-2 mt-2">
                  <div className="flex justify-between text-[#191c1d] font-bold text-lg">
                    <span>Total</span>
                    <span>UGX {(grandTotal + SERVICE_FEE).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Place Order Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa] border-t border-[#bec9bf]/30 max-w-md mx-auto">
          <Button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-white",
              "bg-gradient-to-r",
              theme.gradient,
              isProcessing && "opacity-70"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                Place Order - UGX {(grandTotal + SERVICE_FEE).toLocaleString()}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Payment Step
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] pb-32">
        <header className="sticky top-0 z-40 bg-white border-b border-[#bec9bf]/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('address')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[#f3f4f5] active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
            </button>
            <h1 className="text-lg font-semibold text-[#191c1d]">Payment Method</h1>
          </div>
        </header>

        <div className="px-4 pt-4">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
          />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa] border-t border-[#bec9bf]/30 max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-[#005f3a] to-[#0e7a4d] text-white font-semibold py-4 rounded-xl"
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Address Step
  if (step === 'address') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] pb-32">
        <header className="sticky top-0 z-40 bg-white border-b border-[#bec9bf]/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('cart')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[#f3f4f5] active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
            </button>
            <h1 className="text-lg font-semibold text-[#191c1d]">Delivery Address</h1>
          </div>
        </header>

        <div className="px-4 pt-4">
          <h3 className="text-[#191c1d] font-semibold mb-3">Enter delivery address</h3>
          <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-[#bec9bf]/30 mb-4">
            <MapPin className="h-5 w-5 text-[#6f7a71]" />
            <input
              type="text"
              placeholder="e.g. Ntinda, Kampala"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[#191c1d] placeholder-[#6f7a71]"
            />
          </div>
          <p className="text-[#6f7a71] text-xs">
            Please provide a detailed address including area, street, and building/plot number for easy delivery.
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa] border-t border-[#bec9bf]/30 max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            disabled={!deliveryAddress.trim()}
            className={cn(
              "w-full font-semibold py-4 rounded-xl",
              deliveryAddress.trim()
                ? "bg-gradient-to-r from-[#005f3a] to-[#0e7a4d] text-white"
                : "bg-[#bec9bf] text-[#6f7a71]"
            )}
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Cart View (Default)
  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#bec9bf]/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[#f3f4f5] active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
          </button>
          <h1 className="text-lg font-semibold text-[#191c1d]">Your Cart</h1>
          <span className={cn("ml-auto text-sm px-2 py-1 rounded-full", theme.light)}>
            {cart.items.length} items
          </span>
        </div>
      </header>

      <div className="px-4 pt-4">
        {cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-[#6f7a71]" />
            </div>
            <p className="text-[#6f7a71] mb-2">Your cart is empty</p>
            <p className="text-[#6f7a71] text-sm">Add items to get started</p>
          </div>
        ) : (
          <>
            {/* Service Info */}
            {cart.serviceName && (
              <Card className="bg-white border-[#bec9bf]/30 mb-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", theme.light)}>
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[#191c1d] font-medium">{cart.serviceName}</p>
                      <p className="text-[#6f7a71] text-sm">Delivery: UGX {cart.deliveryFee.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <Card key={item.id} className="bg-white border-[#bec9bf]/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-[#f3f4f5] rounded-xl flex items-center justify-center flex-shrink-0">
                        {item.image ? (
                          <div
                            className="w-full h-full rounded-xl bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image})` }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-[#6f7a71]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[#191c1d] font-medium truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[#6f7a71] text-sm truncate">{item.description}</p>
                        )}
                        <p className={cn("font-semibold mt-1", theme.light.replace('bg-', 'text-').split(' ')[1])}>
                          UGX {item.price.toLocaleString()}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#bec9bf]/30">
                      <p className="text-[#6f7a71] text-sm">Quantity</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-[#f3f4f5] flex items-center justify-center hover:bg-[#e8ebe8] transition-colors"
                        >
                          <span className="text-[#191c1d] text-lg">-</span>
                        </button>
                        <span className="text-[#191c1d] font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className={cn("w-8 h-8 rounded-full flex items-center justify-center", theme.primary)}
                        >
                          <span className="text-[#191c1d] text-lg">+</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pricing Summary */}
            <Card className="bg-white border-[#bec9bf]/30 mt-4">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[#6f7a71]">
                    <span>Subtotal</span>
                    <span>UGX {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#6f7a71]">
                    <span>Delivery Fee</span>
                    <span>UGX {cart.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#6f7a71]">
                    <span>Service Fee</span>
                    <span>UGX {SERVICE_FEE.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#bec9bf]/30 pt-2 mt-2">
                    <div className="flex justify-between text-[#191c1d] font-bold text-lg">
                      <span>Total</span>
                      <span>UGX {(grandTotal + SERVICE_FEE).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Continue Button */}
      {cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa] border-t border-[#bec9bf]/30 max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-white",
              "bg-gradient-to-r",
              theme.gradient
            )}
          >
            Continue to Checkout
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
