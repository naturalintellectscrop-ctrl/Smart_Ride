'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { useCart, CartItem, CartType } from './cart-context';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '@/components/mobile/shared/payment-method-selector';

interface CheckoutScreenProps {
  cartType: CartType;
  onBack: () => void;
  onOrderComplete: () => void;
}

type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirm' | 'success';

// Theme colors based on cart type
const themeColors: Record<CartType, { primary: string; gradient: string; light: string }> = {
  food: { primary: 'bg-orange-600', gradient: 'from-orange-500 to-red-500', light: 'bg-orange-100 text-orange-600' },
  grocery: { primary: 'bg-purple-600', gradient: 'from-purple-500 to-pink-500', light: 'bg-purple-100 text-purple-600' },
  health: { primary: 'bg-emerald-600', gradient: 'from-emerald-500 to-teal-500', light: 'bg-emerald-100 text-emerald-600' },
  shopping: { primary: 'bg-blue-600', gradient: 'from-blue-500 to-indigo-500', light: 'bg-blue-100 text-blue-600' },
};

export function CheckoutScreen({ cartType, onBack, onOrderComplete }: CheckoutScreenProps) {
  const { getCartByType, removeItem, updateQuantity, clearCart, getGrandTotal } = useCart();
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN_MOMO');
  const [deliveryAddress, setDeliveryAddress] = useState('Ntinda, Kampala');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setStep('success');
  };

  const handleContinue = () => {
    if (step === 'cart' && cart.items.length > 0) {
      setStep('address');
    } else if (step === 'address') {
      setStep('payment');
    } else if (step === 'payment') {
      setStep('confirm');
    }
  };

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0D0D12] flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00FF88] to-emerald-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Order Placed!</h1>
          <p className="text-gray-400 mb-2">Your order has been placed successfully</p>
          <p className="text-gray-500 text-sm mb-8">Order ID: #SR{Date.now().toString().slice(-8)}</p>
          
          <div className="bg-[#13131A] rounded-2xl p-4 mb-6 max-w-xs mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1A1A24] rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-[#00FF88]" />
              </div>
              <div className="text-left">
                <p className="text-gray-400 text-sm">Estimated Delivery</p>
                <p className="text-white font-semibold">30-45 minutes</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              clearCart(cartType);
              onOrderComplete();
            }}
            className="w-full bg-gradient-to-r from-[#00FF88] to-emerald-500 text-black font-semibold py-4 rounded-xl"
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
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('payment')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-lg font-semibold text-white">Confirm Order</h1>
          </div>
        </header>

        <div className="px-4 pt-4">
          {/* Order Summary */}
          <Card className="bg-[#13131A] border-white/5 mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3">Order Summary</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1A1A24] rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{item.name}</p>
                        <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-white font-medium">UGX {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card className="bg-[#13131A] border-white/5 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs">Delivery Address</p>
                  <p className="text-white font-medium">{deliveryAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="bg-[#13131A] border-white/5 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-xs">Payment Method</p>
                  <p className="text-white font-medium">{paymentMethodLabels[paymentMethod]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3">Price Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>UGX {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Delivery Fee</span>
                  <span>UGX {cart.deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Service Fee</span>
                  <span>UGX 1,000</span>
                </div>
                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>UGX {(grandTotal + 1000).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Place Order Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12] border-t border-white/5 max-w-md mx-auto">
          <Button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-white",
              "bg-gradient-to-r",
              theme.gradient,
              isProcessing && "opacity-70"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Place Order • UGX {(grandTotal + 1000).toLocaleString()}
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
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('address')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-lg font-semibold text-white">Payment Method</h1>
          </div>
        </header>

        <div className="px-4 pt-4">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
          />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12] border-t border-white/5 max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-[#00FF88] to-emerald-500 text-black font-semibold py-4 rounded-xl"
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
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('cart')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-lg font-semibold text-white">Delivery Address</h1>
          </div>
        </header>

        <div className="px-4 pt-4">
          {/* Saved Addresses */}
          <h3 className="text-white font-semibold mb-3">Saved Addresses</h3>
          <div className="space-y-3 mb-6">
            <Card
              className={cn(
                "cursor-pointer transition-all",
                deliveryAddress === 'Ntinda, Kampala'
                  ? "bg-[#00FF88]/10 border-[#00FF88]/30"
                  : "bg-[#13131A] border-white/5"
              )}
              onClick={() => setDeliveryAddress('Ntinda, Kampala')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Home</p>
                    <p className="text-gray-400 text-sm">Ntinda, Kampala</p>
                  </div>
                  {deliveryAddress === 'Ntinda, Kampala' && (
                    <Check className="h-5 w-5 text-[#00FF88]" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                deliveryAddress === 'Kampala CBD'
                  ? "bg-[#00FF88]/10 border-[#00FF88]/30"
                  : "bg-[#13131A] border-white/5"
              )}
              onClick={() => setDeliveryAddress('Kampala CBD')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Work</p>
                    <p className="text-gray-400 text-sm">Kampala CBD</p>
                  </div>
                  {deliveryAddress === 'Kampala CBD' && (
                    <Check className="h-5 w-5 text-[#00FF88]" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Custom Address */}
          <h3 className="text-white font-semibold mb-3">Or enter new address</h3>
          <div className="bg-[#13131A] rounded-xl p-3 flex items-center gap-3 border border-white/5">
            <MapPin className="h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Enter delivery address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12] border-t border-white/5 max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            disabled={!deliveryAddress}
            className={cn(
              "w-full font-semibold py-4 rounded-xl",
              deliveryAddress
                ? "bg-gradient-to-r from-[#00FF88] to-emerald-500 text-black"
                : "bg-gray-700 text-gray-400"
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
    <div className="min-h-screen bg-[#0D0D12] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Your Cart</h1>
          <span className={cn("ml-auto text-sm px-2 py-1 rounded-full", theme.light)}>
            {cart.items.length} items
          </span>
        </div>
      </header>

      <div className="px-4 pt-4">
        {cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-[#13131A] rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-2">Your cart is empty</p>
            <p className="text-gray-500 text-sm">Add items to get started</p>
          </div>
        ) : (
          <>
            {/* Service Info */}
            {cart.serviceName && (
              <Card className="bg-[#13131A] border-white/5 mb-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", theme.light)}>
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{cart.serviceName}</p>
                      <p className="text-gray-500 text-sm">Delivery: UGX {cart.deliveryFee.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <Card key={item.id} className="bg-[#13131A] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Item Image or Placeholder */}
                      <div className="w-16 h-16 bg-[#1A1A24] rounded-xl flex items-center justify-center flex-shrink-0">
                        {item.image ? (
                          <div
                            className="w-full h-full rounded-xl bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image})` }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-500" />
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-gray-500 text-sm truncate">{item.description}</p>
                        )}
                        <p className={cn("font-semibold mt-1", theme.light.replace('bg-', 'text-').split(' ')[1])}>
                          UGX {item.price.toLocaleString()}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <p className="text-gray-400 text-sm">Quantity</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-[#1A1A24] flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                          <span className="text-white text-lg">−</span>
                        </button>
                        <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className={cn("w-8 h-8 rounded-full flex items-center justify-center", theme.primary)}
                        >
                          <span className="text-white text-lg">+</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pricing Summary */}
            <Card className="bg-[#13131A] border-white/5 mt-4">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>UGX {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Delivery Fee</span>
                    <span>UGX {cart.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/5 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span>UGX {grandTotal.toLocaleString()}</span>
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12] border-t border-white/5 max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-white",
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
