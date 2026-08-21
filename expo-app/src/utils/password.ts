// ============================================
// SMART RIDE MOBILE - PASSWORD RULES
// ============================================
// One canonical rule set for the whole app. Three used to exist: register.tsx
// validated inline, reset-password.tsx had a 5-level scale, change-password.tsx
// had a 4-level scale that excluded the match rule — so the same password could
// read "Strong" on one screen and "Medium" on another.
//
// These rules mirror the server exactly (src/lib/auth/password.ts
// validatePasswordStrength): min 8, one uppercase, one lowercase, one number.
// Keep them in step; a client that accepts what the server rejects sends the
// user round a pointless loop.
// ============================================

export interface PasswordRequirement {
  key: string;
  /** Full sentence, for the checklist under a password field. */
  label: string;
  /** Compact form, for the reference's inline chip row. */
  shortLabel: string;
  test: (password: string, confirm?: string) => boolean;
}

/** The four rules the server enforces. */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    key: 'length',
    label: 'At least 8 characters',
    shortLabel: 'Min 8 characters',
    test: (p) => p.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'One uppercase letter',
    shortLabel: '1 uppercase',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: 'lowercase',
    label: 'One lowercase letter',
    shortLabel: '1 lowercase',
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: 'number',
    label: 'One number',
    shortLabel: '1 number',
    test: (p) => /[0-9]/.test(p),
  },
];

/** The match rule, appended only where a confirm field exists. */
export const PASSWORD_MATCH_REQUIREMENT: PasswordRequirement = {
  key: 'match',
  label: 'Passwords match',
  shortLabel: 'Passwords match',
  test: (p, confirm) => p.length > 0 && p === confirm,
};

export function requirementsFor(withMatch: boolean): PasswordRequirement[] {
  return withMatch
    ? [...PASSWORD_REQUIREMENTS, PASSWORD_MATCH_REQUIREMENT]
    : PASSWORD_REQUIREMENTS;
}

export type PasswordStrengthLevel =
  | 'empty'
  | 'weak'
  | 'fair'
  | 'good'
  | 'strong'
  | 'veryStrong';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  label: string;
  /** How many of `total` segments the meter fills. */
  met: number;
  total: number;
  /** 0–1, for a proportional bar. */
  percent: number;
  /** Which rules passed, keyed by requirement key. */
  results: Record<string, boolean>;
}

const LEVELS: { label: string; level: PasswordStrengthLevel }[] = [
  { label: 'Weak', level: 'weak' },
  { label: 'Fair', level: 'fair' },
  { label: 'Good', level: 'good' },
  { label: 'Strong', level: 'strong' },
  { label: 'Very strong', level: 'veryStrong' },
];

/**
 * Score a password against the canonical rules. Pass `confirm` to include the
 * match rule, which adds a fifth segment to the meter.
 */
export function getPasswordStrength(
  password: string,
  confirm?: string
): PasswordStrengthResult {
  const requirements = requirementsFor(confirm !== undefined);
  const results: Record<string, boolean> = {};
  let met = 0;

  for (const req of requirements) {
    const passed = req.test(password, confirm);
    results[req.key] = passed;
    if (passed) met += 1;
  }

  const total = requirements.length;

  if (password.length === 0) {
    return { level: 'empty', label: '', met: 0, total, percent: 0, results };
  }

  // Map "how many rules passed" onto the label scale. With 4 rules the top
  // label is "Strong"; the match rule is what unlocks "Very strong".
  const index = Math.min(LEVELS.length - 1, Math.max(0, met - 1));
  const { label, level } = LEVELS[index];

  return { level, label, met, total, percent: met / total, results };
}

/**
 * Single source of truth for "can this password be submitted". Mirrors the
 * server's validatePasswordStrength, returning the same message ordering so the
 * user sees the same complaint whether it fails locally or remotely.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}
