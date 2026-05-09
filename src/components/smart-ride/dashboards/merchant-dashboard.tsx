'use client';

import React from 'react';
import { User } from '../types';
import { MerchantDashboard as MerchantDashboardComponent } from './merchant/merchant-dashboard';

interface MerchantDashboardProps {
  user: User;
}

export function MerchantDashboard({ user }: MerchantDashboardProps) {
  return <MerchantDashboardComponent />;
}
