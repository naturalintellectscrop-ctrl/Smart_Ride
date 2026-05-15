/**
 * Phone Number Privacy Utilities
 * 
 * SECURITY: Phone numbers should NEVER be exposed to non-admin users.
 * This module provides utilities to mask phone numbers and protect user privacy.
 */

/**
 * Masks a phone number showing only the last 4 digits
 * Example: +256700123456 -> ****3456
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '****';
  if (phone.length < 4) return '****';
  return `****${phone.slice(-4)}`;
}

/**
 * Masks a phone number with partial visibility
 * Example: +256700123456 -> +256***123456
 */
export function maskPhoneNumberPartial(phone: string | null | undefined): string {
  if (!phone) return '****';
  if (phone.length < 8) return '****';
  
  const prefix = phone.slice(0, 4);
  const suffix = phone.slice(-4);
  return `${prefix}***${suffix}`;
}

/**
 * Formats a phone number for display to admins only
 * Shows the full phone number with proper formatting
 */
export function formatPhoneForAdmin(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  return phone;
}

/**
 * Helper function to conditionally mask phone based on user role
 * @param phone - The phone number to potentially mask
 * @param isAdmin - Whether the requesting user is an admin
 * @returns Masked phone for non-admins, full phone for admins
 */
export function conditionalMaskPhone(
  phone: string | null | undefined,
  isAdmin: boolean
): string {
  if (isAdmin) {
    return phone || 'N/A';
  }
  return maskPhoneNumber(phone);
}

/**
 * Creates a masked user object for API responses
 * Removes/masks sensitive fields for non-admin users
 */
export function maskUserForNonAdmin<T extends { phone?: string | null; email?: string | null }>(
  user: T,
  isAdmin: boolean
): Omit<T, 'phone'> & { phone?: string } {
  if (isAdmin) {
    return user;
  }
  
  const { phone, ...rest } = user;
  return {
    ...rest,
    phone: maskPhoneNumber(phone),
  };
}

/**
 * Creates a masked rider object for API responses
 */
export function maskRiderForNonAdmin<T extends { phone?: string | null }>(
  rider: T,
  isAdmin: boolean
): Omit<T, 'phone'> & { phone?: string } {
  if (isAdmin) {
    return rider;
  }
  
  const { phone, ...rest } = rider;
  return {
    ...rest,
    phone: maskPhoneNumber(phone),
  };
}

/**
 * Creates a masked client object for API responses
 */
export function maskClientForNonAdmin<T extends { phone?: string | null }>(
  client: T,
  isAdmin: boolean
): Omit<T, 'phone'> & { phone?: string } {
  if (isAdmin) {
    return client;
  }
  
  const { phone, ...rest } = client;
  return {
    ...rest,
    phone: maskPhoneNumber(phone),
  };
}
