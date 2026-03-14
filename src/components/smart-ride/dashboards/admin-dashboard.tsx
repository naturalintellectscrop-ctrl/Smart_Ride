'use client';

import React from 'react';
import { User } from '../types';
import { AdminDashboard as AdminDashboardComponent } from '@/components/dashboard/admin-dashboard';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  return <AdminDashboardComponent />;
}
