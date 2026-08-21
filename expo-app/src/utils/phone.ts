// ============================================
// SMART RIDE MOBILE - PHONE NUMBER HELPERS
// ============================================
// Lifted out of app/auth/phone-login.tsx so register, phone-login, the rider
// wizard and merchant registration all normalize and validate the same way.
// Previously each screen had its own idea of what a phone number was: one
// stripped prefixes, one string-concatenated "+256", two accepted free text.
// ============================================

/** Dial code the app sends to the backend. OTP delivery is MTN/Airtel Uganda. */
export const UG_DIAL_CODE = '+256';

/** 9 digits, mobile prefixes 7x / 4x. */
export const UG_SUBSCRIBER_REGEX = /^(7\d|4\d)\d{7}$/;

/** Length of the local subscriber part, once the prefix is stripped. */
export const UG_SUBSCRIBER_LENGTH = 9;

/**
 * Strip spaces/dashes and any +256 / 256 / leading-0 prefix → 9-digit local part.
 * The UI shows a fixed "+256" prefix, so the user normally types just the
 * subscriber number (e.g. 752255676). A pasted 0-prefixed (0752255676) or full
 * +256/256 number reduces to the same 9 digits.
 */
export function toLocalSubscriber(phone: string): string {
  let s = phone.replace(/[\s\-]/g, '');
  if (s.startsWith('+256')) s = s.slice(4);
  else if (s.startsWith('256')) s = s.slice(3);
  else if (s.startsWith('0')) s = s.slice(1);
  return s;
}

export interface PhoneValidation {
  valid: boolean;
  error?: string;
}

export function validateUgandanPhone(phone: string): PhoneValidation {
  if (!phone.replace(/[\s\-]/g, '')) {
    return { valid: false, error: 'Phone number is required' };
  }

  const local = toLocalSubscriber(phone);

  if (local.length < UG_SUBSCRIBER_LENGTH) {
    return { valid: false, error: 'Phone number is too short' };
  }

  if (local.length > UG_SUBSCRIBER_LENGTH) {
    return { valid: false, error: 'Phone number is too long' };
  }

  if (!UG_SUBSCRIBER_REGEX.test(local)) {
    return { valid: false, error: 'Please enter a valid Ugandan phone number' };
  }

  return { valid: true };
}

/** Local or prefixed input → the canonical +256XXXXXXXXX the API expects. */
export function normalizePhone(phone: string): string {
  return UG_DIAL_CODE + toLocalSubscriber(phone);
}

/**
 * Keep only the characters a phone number can contain. Call this from
 * onChangeText — never validate mid-typing, only on blur or submit.
 */
export function sanitizePhoneInput(text: string): string {
  return text.replace(/[^\d\s\-\+]/g, '');
}

/** Cosmetic grouping for display: 752255676 → "752 255 676". */
export function formatSubscriber(phone: string): string {
  const local = toLocalSubscriber(phone);
  const groups = local.match(/.{1,3}/g);
  return groups ? groups.join(' ') : local;
}
