/**
 * SMART RIDE — FIELD ENCRYPTION AT REST (BE-004)
 *
 * The product decision behind this: accurate non-E2EE messaging with real
 * encryption at rest, rather than prematurely shipping end-to-end encryption.
 *
 * What that means concretely, and what it does NOT mean:
 *
 *   IT DOES protect message contents against someone who obtains the database
 *   — a leaked backup, a stolen dump, a misconfigured read replica, or a
 *   support engineer browsing rows. That is the realistic threat here.
 *
 *   IT DOES NOT make messages unreadable to Smart Ride. The server holds the
 *   key, because the platform must be able to read a conversation to
 *   adjudicate a dispute, investigate harassment, or answer a lawful request.
 *   Nothing in the UI may claim otherwise — `verify-security-claims` enforces
 *   that a false "end-to-end encrypted" badge cannot return.
 *
 * AES-256-GCM, authenticated: a tampered ciphertext fails to decrypt rather
 * than silently yielding altered plaintext. Each record gets a fresh random
 * IV, so identical messages do not produce identical ciphertext — without
 * that, "yes"/"no" replies would be trivially distinguishable by pattern.
 *
 * Stored format: `v1:<iv>:<authTag>:<ciphertext>`, all base64. The version
 * prefix is what makes a future key rotation or algorithm change possible
 * without a flag-day migration: old rows keep decrypting under their own
 * scheme while new ones are written under the new one.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits, the GCM-recommended nonce size
const VERSION = 'v1';

/**
 * Derive the 32-byte key from the configured secret.
 *
 * Hashing rather than using the raw env value means the secret does not have
 * to be exactly 32 bytes, and a short secret still produces a full-width key.
 * It does NOT stretch a weak secret into a strong one — MESSAGE_ENCRYPTION_KEY
 * must be generated randomly, not chosen.
 */
function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

let cachedKey: Buffer | null = null;
let keyChecked = false;

/**
 * The configured key, or null when encryption is not configured.
 *
 * Deliberately returns null rather than throwing. A platform that cannot start
 * because a key is missing is worse than one that stores plaintext it already
 * stored yesterday — but the absence is logged loudly, once, so it cannot pass
 * unnoticed in production.
 */
function getKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  if (keyChecked) return null;
  keyChecked = true;

  const secret = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    console.warn(
      '[crypto] MESSAGE_ENCRYPTION_KEY is not set (or is too short). ' +
        'Message contents will be stored in PLAINTEXT. Set a random 32+ character ' +
        'value to enable encryption at rest.'
    );
    return null;
  }
  cachedKey = deriveKey(secret);
  return cachedKey;
}

/** Whether encryption at rest is active. Surfaced by the config audit. */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/** True if a stored value is one of our ciphertexts rather than plaintext. */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`);
}

/**
 * Encrypt a field for storage.
 *
 * Returns the input unchanged when no key is configured, so an unconfigured
 * deployment degrades to today's behaviour rather than losing messages.
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  if (!key || plaintext === '') return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a stored field.
 *
 * Rows written before encryption was enabled are returned as-is — the version
 * prefix is what distinguishes them — so enabling the key does not require
 * backfilling history before messages become readable again.
 *
 * A ciphertext that fails to decrypt returns a placeholder rather than
 * throwing: one unreadable message must not take down a whole conversation
 * view, and GCM failing means the row was tampered with or the key changed,
 * both of which an operator needs to see rather than a 500.
 */
export function decryptField(stored: string): string {
  if (!stored || !isEncrypted(stored)) return stored;

  const key = getKey();
  if (!key) {
    console.error('[crypto] Encrypted value found but no key is configured.');
    return '[unable to decrypt]';
  }

  try {
    const [, ivB64, tagB64, dataB64] = stored.split(':');
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key, or the ciphertext was altered. GCM refuses either way.
    console.error('[crypto] Failed to decrypt a field — wrong key or tampered data.');
    return '[unable to decrypt]';
  }
}

/** Convenience for a nullable column. */
export function encryptNullable(value: string | null | undefined): string | null {
  return value == null ? null : encryptField(value);
}

/** Convenience for a nullable column. */
export function decryptNullable(value: string | null | undefined): string | null {
  return value == null ? null : decryptField(value);
}
