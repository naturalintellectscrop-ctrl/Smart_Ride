'use client';

import React from 'react';
// Service Router - Routes to appropriate service screen based on type
import { FoodDeliveryScreen } from './services/food-delivery-screen';
import { ShoppingScreen } from './services/shopping-screen';
import { ItemDeliveryScreen } from './services/item-delivery-screen';
import { HealthScreen } from './services/health-screen';
import { ServiceScreen } from './service-screen';

// ============================================
// Service Router Component
// ============================================

interface ServiceRouterProps {
  serviceType: 'boda' | 'car' | 'food' | 'shopping' | 'item' | 'health';
  onBack: () => void;
}

export function ServiceRouter({ serviceType, onBack }: ServiceRouterProps) {
  // Food Delivery - Uses merchant/KOT workflow with real-time tracking
  if (serviceType === 'food') {
    return <FoodDeliveryScreen onBack={onBack} />;
  }

  // Shopping - Uses store/product workflow
  if (serviceType === 'shopping') {
    return <ShoppingScreen onBack={onBack} />;
  }

  // Item Delivery - Package pickup/dropoff workflow
  if (serviceType === 'item') {
    return <ItemDeliveryScreen onBack={onBack} />;
  }

  // Health/Pharmacy - Medicine ordering with prescription support
  if (serviceType === 'health') {
    return <HealthScreen onBack={onBack} />;
  }

  // Ride Services (boda/car) - Location → Route → Vehicle → Confirm flow
  return <ServiceScreen serviceType={serviceType} onBack={onBack} />;
}
