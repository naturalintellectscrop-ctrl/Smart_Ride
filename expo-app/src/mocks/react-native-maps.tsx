// ============================================
// WEB MOCK FOR REACT-NATIVE-MAPS
// ============================================
// react-native-maps doesn't work on web, so we provide a simple placeholder
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple placeholder for MapView on web
export const MapView = ({ children, style, ...props }: any) => {
  return (
    <View style={[styles.mapPlaceholder, style]}>
      <Text style={styles.mapText}>🗺️ Map View</Text>
      <Text style={styles.mapSubtext}>Maps are only available on mobile devices</Text>
      {children}
    </View>
  );
};

// Mock Marker component
export const Marker = ({ coordinate, title, description, pinColor, ...props }: any) => {
  return (
    <View style={[styles.marker, { backgroundColor: pinColor || '#FF5722' }]}>
      <Text style={styles.markerText}>📍</Text>
    </View>
  );
};

// Mock Polyline component
export const Polyline = ({ coordinates, strokeColor, strokeWidth, ...props }: any) => {
  return null;
};

// Mock other map components
export const Callout = ({ children, ...props }: any) => children || null;
export const Circle = ({ ...props }: any) => null;
export const Polygon = ({ ...props }: any) => null;
export { Polyline as Line };
export const UrlTile = ({ ...props }: any) => null;
export { Marker as Pin };
export const Geojson = ({ ...props }: any) => null;
export const Heatmap = ({ ...props }: any) => null;
export const Overlay = ({ ...props }: any) => null;

// Mock constants
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4e8',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  mapText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5a2d',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#5a7a5a',
    marginTop: 8,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 16,
  },
});

export default {
  MapView,
  Marker,
  Polyline,
  Callout,
  Circle,
  Polygon,
  UrlTile,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};
