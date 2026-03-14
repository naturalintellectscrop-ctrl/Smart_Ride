/**
 * Smart Ride Client Messages Tab
 * 
 * Enhanced messaging with:
 * - Dynamic badges that update when viewed
 * - Map view in active conversations
 * - Consistent dark theme branding
 */

'use client';

import React from 'react';
import { MessagingProvider } from '../../../context/messaging-context';
import { EnhancedMessagingScreen } from '../../../messaging/enhanced-messaging-screen';

export function ClientMessages() {
  return (
    <MessagingProvider>
      <EnhancedMessagingScreen
        currentUserId="client_001"
        currentUserType="CLIENT"
        showMapInChat={true}
      />
    </MessagingProvider>
  );
}
