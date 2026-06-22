// ============================================
// GET /api/config/mapbox-token
// ============================================
// Returns the Mapbox PUBLIC access token (pk.*) so the mobile app can
// configure its map at runtime if the token wasn't baked in at build time
// (i.e. EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN was not set in expo-app/.env).
//
// This is safe to expose — Mapbox public tokens are designed to be embedded
// in client apps. Secret tokens (sk.*) are NEVER returned by this endpoint.
//
// Response: { success: true, data: { token: "pk.eyJ..." } }
// or        { success: false, error: "Mapbox token not configured" } (500)
// ============================================

import { NextResponse } from 'next/server';
import { getMapboxToken } from '@/lib/mapbox-token';

export async function GET() {
  const token = getMapboxToken();

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Mapbox token not configured. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (or MAPBOX_ACCESS_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN) in your environment variables.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { token },
  });
}
