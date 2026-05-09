/**
 * Client-side JWT utilities
 * 
 * These functions are safe to use in the browser.
 * They decode tokens without cryptographic verification.
 * Real verification happens on the server.
 */

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Decode a JWT token without verification (client-side only)
 * Returns null if token is invalid or expired
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1])) as JwtPayload;
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return payload.exp * 1000 < Date.now();
}

/**
 * Check if a token will expire within the given minutes
 */
export function willTokenExpireSoon(token: string, minutes: number = 5): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return payload.exp * 1000 < Date.now() + minutes * 60 * 1000;
}
