'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Menu,
  HelpCircle,
  Crown,
  Star,
  Gift,
  Copy,
  Share2,
  Tag,
  Zap,
  Coffee,
  Bike,
  ShoppingCart,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// Promotions & Rewards — Stitch Light Theme Design
// ============================================================================

interface PromoCard {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: string;
  expiry: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const promoCards: PromoCard[] = [
  {
    id: '1',
    title: 'First Ride Free',
    description: 'Enjoy your first Smart Boda ride on us!',
    code: 'WELCOME50',
    discount: '50% OFF',
    expiry: 'Mar 31',
    icon: Bike,
    color: 'text-[#005f3a]',
    bgColor: 'bg-[#6bff8f]/20',
  },
  {
    id: '2',
    title: 'Food Delivery Deal',
    description: 'Half off your next food delivery order',
    code: 'FOOD50',
    discount: '50% OFF',
    expiry: 'Apr 15',
    icon: Coffee,
    color: 'text-[#006e2f]',
    bgColor: 'bg-[#6bff8f]/20',
  },
  {
    id: '3',
    title: 'Grocery Savings',
    description: 'Save big on your Smart Grocery orders',
    code: 'GROCERY30',
    discount: '30% OFF',
    expiry: 'Apr 30',
    icon: ShoppingCart,
    color: 'text-[#005f3a]',
    bgColor: 'bg-[#6bff8f]/20',
  },
  {
    id: '4',
    title: 'Flash Delivery',
    description: 'Quick courier at unbeatable prices',
    code: 'FLASH25',
    discount: '25% OFF',
    expiry: 'Mar 20',
    icon: Zap,
    color: 'text-[#006e2f]',
    bgColor: 'bg-[#6bff8f]/20',
  },
];

interface RedeemItem {
  id: string;
  title: string;
  points: number;
  icon: React.ElementType;
  bgColor: string;
}

const redeemItems: RedeemItem[] = [
  { id: '1', title: 'Free Ride', points: 500, icon: Bike, bgColor: 'bg-[#6bff8f]/20' },
  { id: '2', title: 'Food Voucher', points: 750, icon: Coffee, bgColor: 'bg-[#edeeef]' },
  { id: '3', title: 'UGX 5,000', points: 1000, icon: Star, bgColor: 'bg-[#6bff8f]/20' },
  { id: '4', title: 'Free Delivery', points: 300, icon: ShoppingCart, bgColor: 'bg-[#edeeef]' },
];

export function ClientPromotions() {
  const [appliedCode, setAppliedCode] = useState('');
  const [codeResult, setCodeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loyaltyPoints = 2450;
  const nextTierPoints = 3000;
  const progressPercent = (loyaltyPoints / nextTierPoints) * 100;
  const referralCode = 'SMARTRIDE-JD2024';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApplyCode = () => {
    if (!appliedCode.trim()) return;
    // Simulate code application — in production this calls an API
    const valid = promoCards.some(p => p.code.toLowerCase() === appliedCode.trim().toLowerCase());
    if (valid) {
      setCodeResult({ success: true, message: 'Code applied successfully! Discount added to your next order.' });
    } else {
      setCodeResult({ success: false, message: 'Invalid code. Please check and try again.' });
    }
    setTimeout(() => setCodeResult(null), 4000);
  };

  const handleShareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Smart Ride!',
        text: `Use my referral code ${referralCode} to get UGX 10,000 off your first ride!`,
        url: 'https://smartride.ug',
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`Join Smart Ride! Use my code ${referralCode} for UGX 10,000 off!`).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-4">
      {/* Header — sticky, shadow-sm */}
      <div className="bg-white px-4 py-4 border-b border-[#bec9bf]/30 sticky top-6 z-40 shadow-sm">
        <div className="flex items-center justify-between">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#edeeef] transition-colors">
            <Menu className="h-5 w-5 text-[#191c1d]" />
          </button>
          <h1 className="text-lg font-bold text-[#191c1d]">Promotions & Rewards</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#edeeef] transition-colors">
            <HelpCircle className="h-5 w-5 text-[#6f7a71]" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Loyalty Card — bg-primary-container, rounded-xl, decorative blur circle */}
        <Card className="relative overflow-hidden rounded-xl border-0 p-6" style={{ backgroundColor: '#0e7a4d' }}>
          {/* Decorative blur circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-lg" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-[#a6ffc9]" />
              <span className="text-sm font-semibold text-[#a6ffc9] uppercase tracking-wider">Gold Member</span>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-white">{loyaltyPoints.toLocaleString()}</p>
              <p className="text-sm text-white/70 mt-1">Loyalty Points</p>
            </div>

            {/* Progress bar — bg-black/20 track, bg-secondary-fixed fill with glow shadow */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Progress to Platinum</span>
                <span className="text-white/80 font-medium">{nextTierPoints - loyaltyPoints} pts to go</span>
              </div>
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: '#6bff8f',
                    boxShadow: '0 0 8px rgba(107, 255, 143, 0.5)',
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Promo Cards — Horizontal scroll, 280px wide, shadow-sm, border outline-variant */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#005f3a]" />
              Active Promos
            </h2>
            <button className="text-[#005f3a] text-sm font-medium flex items-center gap-1 hover:underline">
              View All
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {promoCards.map((promo) => {
              const Icon = promo.icon;
              return (
                <Card
                  key={promo.id}
                  className="flex-shrink-0 w-[280px] bg-white border border-[#bec9bf]/30 shadow-sm rounded-xl overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', promo.bgColor)}>
                        <Icon className={cn('h-5 w-5', promo.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#191c1d] text-sm">{promo.title}</h3>
                        <p className="text-xs text-[#6f7a71] mt-0.5">{promo.description}</p>
                      </div>
                    </div>

                    {/* Dashed divider */}
                    <div className="border-t border-dashed border-[#bec9bf]/50 my-3" />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#6f7a71]">Promo Code</p>
                        <p className="font-bold text-[#005f3a] text-sm">{promo.code}</p>
                      </div>
                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#edeeef] text-xs font-medium text-[#3f4941] hover:bg-[#e7e8e9] transition-colors"
                      >
                        {copiedCode === promo.code ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#005f3a]" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-bold text-[#005f3a] bg-[#6bff8f]/20 px-2 py-0.5 rounded">
                        {promo.discount}
                      </span>
                      <span className="text-xs text-[#6f7a71]">Exp: {promo.expiry}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Refer & Earn — Image header with gradient, referral code display, copy/share buttons */}
        <Card className="overflow-hidden rounded-xl border-0 shadow-sm">
          {/* Gradient header */}
          <div
            className="relative px-6 py-8"
            style={{
              background: 'linear-gradient(135deg, #005f3a 0%, #0e7a4d 50%, #006e2f 100%)',
            }}
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-[#a6ffc9]" />
                <h2 className="text-xl font-bold text-white">Refer & Earn</h2>
              </div>
              <p className="text-white/80 text-sm">
                Share Smart Ride with friends and earn UGX 10,000 for each successful referral!
              </p>
            </div>
          </div>

          <div className="bg-white p-6">
            {/* Referral code display */}
            <div className="bg-[#f3f4f5] border border-dashed border-[#bec9bf] rounded-xl p-4 text-center mb-4">
              <p className="text-xs text-[#6f7a71] mb-1">Your Referral Code</p>
              <p className="text-lg font-bold text-[#005f3a] tracking-wide">{referralCode}</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleCopyCode(referralCode)}
                variant="outline"
                className="flex-1 h-14 border-[#bec9bf]/50 text-[#3f4941] hover:bg-[#edeeef] hover:text-[#191c1d] rounded-xl"
              >
                {copiedCode === referralCode ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2 text-[#005f3a]" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
              <Button
                onClick={handleShareReferral}
                className="flex-1 h-14 bg-[#005f3a] hover:bg-[#0e7a4d] text-white rounded-xl"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </Card>

        {/* Redeem Grid — 2x2, aspect-square icon containers, points displayed with star icon */}
        <div>
          <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#005f3a]" />
            Redeem Points
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {redeemItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  className="bg-white border border-[#bec9bf]/30 shadow-sm rounded-xl p-4 cursor-pointer hover:border-[#6f7a71]/30 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className={cn('w-14 h-14 aspect-square rounded-xl flex items-center justify-center mb-3', item.bgColor)}>
                    <Icon className="h-7 w-7 text-[#005f3a]" />
                  </div>
                  <h3 className="font-semibold text-[#191c1d] text-sm">{item.title}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 text-[#6bff8f] fill-[#6bff8f]" />
                    <span className="text-sm font-medium text-[#005f3a]">{item.points.toLocaleString()} pts</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Apply Code — Input + Apply button (h-14 each) */}
        <div>
          <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#005f3a]" />
            Apply Promo Code
          </h2>
          <div className="flex gap-3">
            <Input
              value={appliedCode}
              onChange={(e) => { setAppliedCode(e.target.value.toUpperCase()); setCodeResult(null); }}
              placeholder="Enter promo code"
              className="h-14 bg-white border-[#bec9bf]/30 text-[#191c1d] placeholder:text-[#bec9bf] focus:border-[#005f3a]/30 rounded-xl text-sm"
            />
            <Button
              onClick={handleApplyCode}
              disabled={!appliedCode.trim()}
              className="h-14 px-6 bg-[#005f3a] hover:bg-[#0e7a4d] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Code result feedback */}
          {codeResult && (
            <div
              className={cn(
                'mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2',
                codeResult.success
                  ? 'bg-[#6bff8f]/15 text-[#005f3a] border border-[#6bff8f]/30'
                  : 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20'
              )}
            >
              {codeResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">!</span>
              )}
              {codeResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
