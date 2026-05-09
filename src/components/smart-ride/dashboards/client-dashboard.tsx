'use client';

import React from 'react';
import { User } from '../types';
import { ClientDashboard as ClientDashboardComponent } from './client/client-dashboard';

interface ClientDashboardProps {
  user: User;
}

export function ClientDashboard({ user }: ClientDashboardProps) {
  return <ClientDashboardComponent />;
}
