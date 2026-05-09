# Smart Ride - Integration Guide

This document provides step-by-step guides for integrating external services into Smart Ride.

---

## ✅ Implementation Status

| Service | Status | Notes |
|---------|--------|-------|
| Mapbox Maps | ✅ Implemented | See `/src/lib/maps/mapbox-service.ts` and `/src/components/maps/` |
| MTN MoMo | ✅ Implemented | See `/src/lib/payments/mtn-momo.ts` |
| Airtel Money | ✅ Implemented | See `/src/lib/payments/airtel-money.ts` |
| Payment Service | ✅ Implemented | See `/src/lib/payments/payment-service.ts` |
| Push Notifications | ⏳ Pending | Firebase integration required |
| OTP Verification | ⏳ Pending | Africa's Talking integration required |
| Production Deploy | ⏳ Pending | Configuration required |

---

## Table of Contents

1. [Map Integration](#1-map-integration)
2. [Payment Gateway](#2-payment-gateway)
3. [Push Notifications](#3-push-notifications)
4. [OTP Verification](#4-otp-verification)
5. [Production Deployment](#5-production-deployment)

---

## 1. Map Integration

### Options Comparison

| Feature | Google Maps | Mapbox | OpenStreetMap |
|---------|-------------|--------|---------------|
| Cost | $200 credit/month, then pay | 50k loads/month free | Free |
| Africa Coverage | Excellent | Good | Good |
| Real-time Traffic | ✅ | ✅ | ❌ |
| Directions API | ✅ | ✅ | Limited |
| Place Autocomplete | ✅ | ✅ | Limited |
| Kampala Support | Excellent | Good | Good |

### Recommendation: **Mapbox** (Best value for Uganda)

**Why Mapbox?**
- 50,000 free map loads/month
- Excellent Africa coverage
- Good documentation
- Real-time traffic support
- Cheaper than Google Maps

### Implementation Steps

#### Step 1: Get Mapbox Access Token

1. Go to https://account.mapbox.com/
2. Create a free account
3. Copy your Access Token

#### Step 2: Install Dependencies

```bash
bun add mapbox-gl @mapbox/mapbox-gl-geocoder
```

#### Step 3: Add to Environment Variables

```env
# .env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
MAPBOX_TOKEN=pk.your_mapbox_secret_token_here
```

#### Step 4: Create Map Components

**File: `src/components/maps/mapbox-map.tsx`**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  pickup?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number };
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
}

export function MapboxMap({ pickup, destination, driverLocation, onLocationSelect }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(32.5825); // Kampala longitude
  const [lat, setLat] = useState(0.3476); // Kampala latitude
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add click handler for location selection
    map.current.on('click', (e) => {
      if (onLocationSelect) {
        // Reverse geocode to get address
        reverseGeocode(e.lngLat.lat, e.lngLat.lng).then(address => {
          onLocationSelect({
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            address,
          });
        });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach(el => el.remove());

    // Add pickup marker
    if (pickup) {
      new mapboxgl.Marker({ color: '#00FF88' })
        .setLngLat([pickup.lng, pickup.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Pickup</h3>'))
        .addTo(map.current);
    }

    // Add destination marker
    if (destination) {
      new mapboxgl.Marker({ color: '#FF3B5C' })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Destination</h3>'))
        .addTo(map.current);
    }

    // Add driver marker
    if (driverLocation) {
      const driverEl = document.createElement('div');
      driverEl.className = 'driver-marker';
      driverEl.innerHTML = '🚗';
      new mapboxgl.Marker(driverEl)
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .addTo(map.current);
    }

    // Fit bounds if both pickup and destination exist
    if (pickup && destination) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickup.lng, pickup.lat]);
      bounds.extend([destination.lng, destination.lat]);
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [pickup, destination, driverLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}

// Reverse geocoding function
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}`
  );
  const data = await response.json();
  return data.features[0]?.place_name || 'Unknown location';
}
```

**File: `src/components/maps/location-search.tsx`**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface LocationSearchProps {
  placeholder: string;
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
}

export function LocationSearch({ placeholder, onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const searchPlaces = async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      // Focus on Uganda (bbox: [29.5, -1.5, 35.0, 4.2])
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=ug&limit=5`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
    };

    const debounceTimer = setTimeout(searchPlaces, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (feature: any) => {
    const [lng, lat] = feature.center;
    onLocationSelect({
      lat,
      lng,
      address: feature.place_name,
    });
    setQuery(feature.place_name);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className="bg-slate-800 border-slate-700 text-white"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleSelect(feature)}
              className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 border-b border-slate-700 last:border-b-0"
            >
              <div className="font-medium">{feature.text}</div>
              <div className="text-sm text-gray-400">{feature.place_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Step 5: Distance & Duration API

**File: `src/lib/maps/route.ts`**

```typescript
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // polyline coordinates
}

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteInfo | null> {
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson`
  );
  
  const data = await response.json();
  
  if (data.code !== 'Ok' || !data.routes[0]) {
    return null;
  }

  return {
    distance: data.routes[0].distance,
    duration: data.routes[0].duration,
    geometry: data.routes[0].geometry.coordinates,
  };
}

// Calculate fare based on distance
export function calculateFare(distanceMeters: number, vehicleType: 'boda' | 'car' | 'delivery'): number {
  const distanceKm = distanceMeters / 1000;
  
  const pricing = {
    boda: { base: 2000, perKm: 800 },  // UGX
    car: { base: 5000, perKm: 1500 },
    delivery: { base: 3000, perKm: 500 },
  };

  const { base, perKm } = pricing[vehicleType];
  return Math.round(base + (distanceKm * perKm));
}
```

---

## 2. Payment Gateway

### MTN Mobile Money (MoMo API)

#### Step 1: Register for MTN MoMo API

1. Go to https://momodeveloper.mtn.com/
2. Create developer account
3. Create a new product (Collection API)
4. Get your API Key and User ID

#### Step 2: Environment Variables

```env
# MTN MoMo API
MTN_MOMO_API_KEY=your_api_key
MTN_MOMO_USER_ID=your_user_id
MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key
MTN_MOMO_ENVIRONMENT=sandbox  # or 'production'
```

#### Step 3: MTN MoMo Service

**File: `src/lib/payments/mtn-momo.ts`**

```typescript
const MTN_MOMO_BASE_URL = process.env.MTN_MOMO_ENVIRONMENT === 'production'
  ? 'https://momodeveloper.mtn.com'
  : 'https://sandbox.momodeveloper.mtn.com';

interface PaymentRequest {
  amount: string;
  currency: string;
  externalId: string;
  payer: { partyIdType: string; partyId: string };
  payerMessage: string;
  payeeNote: string;
}

export async function requestToPay(
  phoneNumber: string,
  amount: number,
  referenceId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    // Step 1: Get Access Token
    const tokenResponse = await fetch(
      `${MTN_MOMO_BASE_URL}/collection/token/`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
          'Authorization': `Basic ${Buffer.from(
            `${process.env.MTN_MOMO_USER_ID}:${process.env.MTN_MOMO_API_KEY}`
          ).toString('base64')}`,
        },
      }
    );
    
    const { access_token } = await tokenResponse.json();

    // Step 2: Request Payment
    const paymentData: PaymentRequest = {
      amount: amount.toString(),
      currency: 'UGX',
      externalId: referenceId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: phoneNumber.replace('+', ''), // Remove + prefix
      },
      payerMessage: 'Smart Ride Payment',
      payeeNote: 'Payment for ride/delivery',
    };

    const paymentResponse = await fetch(
      `${MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      }
    );

    if (paymentResponse.status === 202) {
      return { success: true, transactionId: referenceId };
    } else {
      const error = await paymentResponse.json();
      return { success: false, error: error.message || 'Payment failed' };
    }
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function checkPaymentStatus(referenceId: string): Promise<{
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'REJECTED';
  financialTransactionId?: string;
}> {
  const tokenResponse = await fetch(
    `${MTN_MOMO_BASE_URL}/collection/token/`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
        'Authorization': `Basic ${Buffer.from(
          `${process.env.MTN_MOMO_USER_ID}:${process.env.MTN_MOMO_API_KEY}`
        ).toString('base64')}`,
      },
    }
  );
  
  const { access_token } = await tokenResponse.json();

  const response = await fetch(
    `${MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
      },
    }
  );

  const data = await response.json();
  return {
    status: data.status,
    financialTransactionId: data.financialTransactionId,
  };
}
```

### Airtel Money API

**File: `src/lib/payments/airtel-money.ts`**

```typescript
const AIRTEL_MONEY_BASE_URL = 'https://openapiuat.airtel.africa'; // Use production URL for live

export async function initiateAirtelPayment(
  phoneNumber: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const response = await fetch(
      `${AIRTEL_MONEY_BASE_URL}/merchant/v1/payments/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AIRTEL_ACCESS_TOKEN}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
        body: JSON.stringify({
          reference: reference,
          subscriber: {
            country: 'UG',
            currency: 'UGX',
            msisdn: phoneNumber.replace('+256', ''), // Remove country code
          },
          transaction: {
            amount: amount,
            country: 'UG',
            currency: 'UGX',
            id: reference,
          },
        }),
      }
    );

    const data = await response.json();
    
    if (data.status?.success) {
      return { success: true, transactionId: reference };
    }
    
    return { success: false, error: data.status?.message || 'Payment failed' };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}
```

---

## 3. Push Notifications

### Firebase Cloud Messaging (FCM)

#### Step 1: Set Up Firebase Project

1. Go to https://console.firebase.google.com/
2. Create new project "Smart Ride"
3. Add Android and/or iOS app
4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
5. Go to Project Settings > Cloud Messaging and get Server Key

#### Step 2: Install Dependencies

```bash
bun add firebase-admin
```

#### Step 3: Firebase Admin Setup

**File: `src/lib/notifications/firebase.ts`**

```typescript
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const messaging = admin.messaging();

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    await messaging.send({
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'smart-ride',
          priority: 'high',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

// Send to multiple devices
export async function sendMulticastNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<admin.messaging.BatchResponse> {
  return await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: data || {},
    android: {
      priority: 'high',
    },
  });
}
```

#### Step 4: Notification Types

**File: `src/lib/notifications/templates.ts`**

```typescript
export const NOTIFICATION_TEMPLATES = {
  // Ride notifications
  RIDE_ARRIVING: (riderName: string, eta: number) => ({
    title: 'Your ride is arriving! 🚗',
    body: `${riderName} will arrive in ${eta} minutes`,
  }),
  
  RIDE_STARTED: (destination: string) => ({
    title: 'Ride started',
    body: `On the way to ${destination}`,
  }),
  
  RIDE_COMPLETED: (amount: number) => ({
    title: 'Ride completed! ✅',
    body: `Total fare: UGX ${amount.toLocaleString()}`,
  }),

  // Order notifications
  ORDER_ACCEPTED: (merchantName: string) => ({
    title: 'Order accepted',
    body: `${merchantName} is preparing your order`,
  }),
  
  ORDER_READY: (merchantName: string) => ({
    title: 'Order ready for pickup',
    body: `${merchantName} has prepared your order`,
  }),
  
  RIDER_ASSIGNED: (riderName: string) => ({
    title: 'Rider assigned',
    body: `${riderName} is picking up your order`,
  }),

  // Payment notifications
  PAYMENT_SUCCESS: (amount: number) => ({
    title: 'Payment successful ✅',
    body: `UGX ${amount.toLocaleString()} has been deducted`,
  }),
  
  PAYMENT_FAILED: () => ({
    title: 'Payment failed',
    body: 'Please try again or use a different payment method',
  }),

  // Safety notifications
  SOS_ALERT: (userName: string) => ({
    title: '🚨 SOS ALERT',
    body: `${userName} has triggered an emergency alert`,
  }),
};
```

---

## 4. OTP Verification

### Africa's Talking SMS API

**Recommended for Uganda** - Good local SMS delivery

#### Step 1: Sign Up

1. Go to https://africastalking.com/
2. Create account
3. Get API Key from Settings

#### Step 2: Environment Variables

```env
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
AFRICAS_TALKING_SENDER_ID=SMARTRIDE  # Optional custom sender ID
```

#### Step 3: SMS Service

**File: `src/lib/sms/africas-talking.ts`**

```typescript
const AFRICAS_TALKING_BASE_URL = 'https://api.africastalking.com/version1/messaging';

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(AFRICAS_TALKING_BASE_URL, {
      method: 'POST',
      headers: {
        'apiKey': process.env.AFRICAS_TALKING_API_KEY!,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: process.env.AFRICAS_TALKING_USERNAME!,
        to: phoneNumber,
        message: message,
        from: process.env.AFRICAS_TALKING_SENDER_ID || 'SMART_RIDE',
      }),
    });

    const data = await response.json();
    
    if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      return {
        success: true,
        messageId: data.SMSMessageData.Recipients[0].messageId,
      };
    }
    
    return { success: false, error: data.SMSMessageData?.Message || 'SMS failed' };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// Generate and send OTP
export async function sendOTP(phoneNumber: string): Promise<{
  success: boolean;
  otpId?: string;
  error?: string;
}> {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP in database with expiry (5 minutes)
  const otpId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // TODO: Store in Redis or database with TTL
  // await redis.setex(otpId, 300, JSON.stringify({ phone: phoneNumber, otp }));
  
  const message = `Your Smart Ride verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
  
  const result = await sendSMS(phoneNumber, message);
  
  if (result.success) {
    return { success: true, otpId };
  }
  
  return { success: false, error: result.error };
}

// Verify OTP
export async function verifyOTP(
  otpId: string,
  phoneNumber: string,
  enteredOTP: string
): Promise<boolean> {
  // TODO: Retrieve from Redis or database
  // const stored = await redis.get(otpId);
  // if (!stored) return false;
  // const data = JSON.parse(stored);
  // return data.phone === phoneNumber && data.otp === enteredOTP;
  
  // For testing: accept any 6-digit code
  return /^\d{6}$/.test(enteredOTP);
}
```

#### Step 4: OTP API Endpoint

**File: `src/app/api/auth/send-otp/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sendOTP } from '@/lib/sms/africas-talking';
import { z } from 'zod';

const sendOTPSchema = z.object({
  phone: z.string().regex(/^\+256\d{9}$/, 'Invalid Uganda phone number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = sendOTPSchema.parse(body);

    const result = await sendOTP(phone);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      otpId: result.otpId,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
```

---

## 5. Production Deployment

### Option A: Vercel (Recommended for Next.js)

#### Step 1: Prepare for Deployment

**File: `vercel.json`**

```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret",
    "NEXT_PUBLIC_MAPBOX_TOKEN": "@mapbox_token",
    "MAPBOX_TOKEN": "@mapbox_token",
    "MTN_MOMO_API_KEY": "@mtn_api_key",
    "MTN_MOMO_USER_ID": "@mtn_user_id",
    "MTN_MOMO_SUBSCRIPTION_KEY": "@mtn_subscription_key",
    "FIREBASE_PROJECT_ID": "@firebase_project_id",
    "FIREBASE_CLIENT_EMAIL": "@firebase_client_email",
    "FIREBASE_PRIVATE_KEY": "@firebase_private_key"
  }
}
```

#### Step 2: Deploy Commands

```bash
# Install Vercel CLI
bun add -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
# ... add all other env vars
```

### Option B: Docker Deployment

**File: `Dockerfile`**

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Build
FROM base AS builder
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/production.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  realtime-service:
    build: ./mini-services/realtime-service
    ports:
      - "3002:3002"
    restart: unless-stopped

  heartbeat-monitor:
    build: ./mini-services/heartbeat-monitor
    ports:
      - "3004:3004"
    restart: unless-stopped
```

### Option C: DigitalOcean / AWS / VPS

#### System Requirements

- **CPU**: 2 vCPUs minimum
- **RAM**: 4GB minimum
- **Storage**: 20GB SSD
- **OS**: Ubuntu 22.04 LTS

#### Deployment Script

```bash
#!/bin/bash
# deploy.sh

# Update system
sudo apt update && sudo apt upgrade -y

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PM2 for process management
npm install -g pm2

# Clone repository
git clone https://github.com/naturalintellectscrop-ctrl/Smart_Ride.git
cd Smart_Ride

# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Run database migrations
bunx prisma migrate deploy

# Build application
bun run build

# Start with PM2
pm2 start "bun run start" --name "smart-ride-api"

# Start mini-services
pm2 start "bun run dev" --name "realtime-service" -- cwd ./mini-services/realtime-service
pm2 start "bun run dev" --name "heartbeat-monitor" -- cwd ./mini-services/heartbeat-monitor

# Save PM2 config
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt install nginx -y
sudo tee /etc/nginx/sites-available/smartride << EOF
server {
    listen 80;
    server_name api.smartride.ug;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/smartride /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.smartride.ug
```

---

## Environment Variables Summary

Create a `.env.production` file:

```env
# Database
DATABASE_URL="file:./data/production.db"

# JWT Authentication
JWT_SECRET="your-32-character-secret-key-change-in-production"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.xxx"
MAPBOX_TOKEN="pk.xxx"

# MTN Mobile Money
MTN_MOMO_API_KEY="xxx"
MTN_MOMO_USER_ID="xxx"
MTN_MOMO_SUBSCRIPTION_KEY="xxx"
MTN_MOMO_ENVIRONMENT="production"

# Airtel Money (optional)
AIRTEL_ACCESS_TOKEN="xxx"

# Firebase / Push Notifications
FIREBASE_PROJECT_ID="smart-ride-xxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@smart-ride.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"

# Africa's Talking SMS
AFRICAS_TALKING_API_KEY="xxx"
AFRICAS_TALKING_USERNAME="smart_ride"
AFRICAS_TALKING_SENDER_ID="SMARTRIDE"

# App URLs
NEXT_PUBLIC_APP_URL="https://smartride.ug"
NEXT_PUBLIC_API_URL="https://api.smartride.ug"
```

---

## Quick Start Checklist

- [ ] Mapbox account created and token obtained
- [ ] MTN MoMo developer account created
- [ ] Firebase project created with FCM enabled
- [ ] Africa's Talking account created
- [ ] Production database configured
- [ ] Environment variables set
- [ ] SSL certificate configured
- [ ] Domain names configured:
  - `smartride.ug` - Main app
  - `api.smartride.ug` - API server
  - `admin.smartride.ug` - Admin dashboard
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented

---

*Last Updated: Integration Guide v1.0*
