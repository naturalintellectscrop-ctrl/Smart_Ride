// ============================================
// SMART RIDE - STORAGE ABSTRACTION
// ============================================
// Provides a unified interface for file storage.
// In development: uses local filesystem.
// In production: uses S3-compatible storage (AWS S3, Cloudflare R2, etc.)
// Controlled by STORAGE_TYPE env var (default: 'local')
// ============================================

import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface StorageProvider {
  /**
   * Upload a file and return its accessible URL or relative path
   */
  upload(key: string, data: Buffer, contentType: string): Promise<string>;

  /**
   * Get the URL for accessing a stored file
   */
  getUrl(key: string): string;

  /**
   * Delete a stored file
   */
  delete(key: string): Promise<void>;
}

// ============================================
// LOCAL STORAGE PROVIDER
// ============================================

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(filePath, data);

    // Return relative URL path for local storage
    return `/api/uploads/${key}`;
  }

  getUrl(key: string): string {
    return `/api/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  /**
   * Read a file from local storage (used by the serving route)
   */
  async readFile(key: string): Promise<Buffer | null> {
    const filePath = path.join(this.baseDir, key);
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve(this.baseDir);

    // Security check - ensure the path is within uploads folder
    if (!resolvedPath.startsWith(uploadsDir)) {
      return null;
    }

    if (!existsSync(resolvedPath)) {
      return null;
    }

    return readFile(resolvedPath);
  }
}

// ============================================
// S3 STORAGE PROVIDER
// ============================================

class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string | undefined;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.bucket = process.env.S3_BUCKET || 'smart-ride-uploads';

    // Optional: custom endpoint for Cloudflare R2 or other S3-compatible services
    const endpoint = process.env.S3_ENDPOINT;
    // Optional: custom public URL for accessing files (e.g., CDN URL)
    this.publicUrl = process.env.S3_PUBLIC_URL;

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      ...(endpoint ? { endpoint } : {}),
    });
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );

    return this.getUrl(key);
  }

  getUrl(key: string): string {
    // If a custom public URL is configured (e.g., CDN), use it
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }

    // Otherwise, construct the standard S3 URL
    const region = process.env.AWS_REGION || 'us-east-1';
    // Check for custom endpoint (R2 uses different URL format)
    const endpoint = process.env.S3_ENDPOINT;
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  /**
   * Generate a presigned URL for temporary access (useful for private buckets)
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}

// ============================================
// SUPABASE STORAGE PROVIDER
// ============================================
// Uses Supabase Storage (the project's existing infra) via the service-role
// key — no extra credentials. Works on Vercel where the filesystem is
// read-only. The bucket is created (public) on first use if missing.

class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;
  private url: string;
  private ensured = false;

  constructor() {
    this.url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
    this.client = createClient(this.url, serviceKey, { auth: { persistSession: false } });
  }

  private async ensureBucket(): Promise<void> {
    if (this.ensured) return;
    try {
      const { data } = await this.client.storage.getBucket(this.bucket);
      if (!data) {
        await this.client.storage.createBucket(this.bucket, { public: true });
      }
    } catch {
      // createBucket throws if it already exists in a race — safe to ignore
      try { await this.client.storage.createBucket(this.bucket, { public: true }); } catch { /* exists */ }
    }
    this.ensured = true;
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket();
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, data, { contentType, upsert: true });
    if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
    return this.getUrl(key);
  }

  getUrl(key: string): string {
    return `${this.url.replace(/\/$/, '')}/storage/v1/object/public/${this.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.storage.from(this.bucket).remove([key]);
  }
}

// ============================================
// STORAGE PROVIDER FACTORY
// ============================================

let _storageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_storageProvider) return _storageProvider;

  // Auto-select Supabase in production (service-role key present) — the local
  // filesystem provider does NOT work on Vercel (read-only). Explicit
  // STORAGE_TYPE always wins.
  const hasSupabase = !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const type = process.env.STORAGE_TYPE || (hasSupabase ? 'supabase' : 'local');

  if (type === 'supabase') {
    console.log('[STORAGE] Using Supabase storage provider');
    _storageProvider = new SupabaseStorageProvider();
  } else if (type === 's3') {
    console.log('[STORAGE] Using S3 storage provider');
    _storageProvider = new S3StorageProvider();
  } else {
    console.log('[STORAGE] Using local storage provider');
    _storageProvider = new LocalStorageProvider();
  }

  return _storageProvider;
}

/**
 * Check if we're using local storage
 */
export function isLocalStorage(): boolean {
  return (process.env.STORAGE_TYPE || 'local') === 'local';
}

/**
 * Get the local storage provider (for reading files from filesystem).
 * Only valid when using local storage.
 */
export function getLocalStorageProvider(): LocalStorageProvider | null {
  if (isLocalStorage()) {
    return getStorageProvider() as LocalStorageProvider;
  }
  return null;
}

/**
 * Get the S3 storage provider (for presigned URLs, etc.).
 * Only valid when using S3 storage.
 */
export function getS3StorageProvider(): S3StorageProvider | null {
  if (!isLocalStorage()) {
    return getStorageProvider() as S3StorageProvider;
  }
  return null;
}
