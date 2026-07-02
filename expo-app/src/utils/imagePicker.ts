// ============================================
// SMART RIDE MOBILE - IMAGE PICKER UTILITY
// ============================================
// Handles photo selection from gallery and camera
// with permission management
// ============================================

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Alert } from '@/src/components/feedback';

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export async function pickImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<ImagePickerResult | null> {
  // Request permission
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload images.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: options?.quality ?? 0.7,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const uri = asset.uri;
  const name = uri.split('/').pop() || 'photo.jpg';
  // Prefer the asset's real mimeType; normalize "jpg" → "jpeg" so the backend
  // allow-list accepts it.
  const ext = (name.split('.').pop() || 'jpeg').toLowerCase();
  const type = (asset as any).mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  return { uri, type, name, size: asset.fileSize };
}

export async function takePhoto(): Promise<ImagePickerResult | null> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera access to take photos.');
      return null;
    }
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const uri = asset.uri;
  const name = uri.split('/').pop() || 'photo.jpg';
  const ext = (name.split('.').pop() || 'jpeg').toLowerCase();
  const type = (asset as any).mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  return { uri, type, name, size: asset.fileSize };
}
