// ============================================
// MAPBOX ACCESS TOKEN RESOLVER (Backend)
// ============================================
// Resolves the Mapbox public access token from environment variables.
//
// Configure on Vercel → Settings → Environment Variables by setting ANY of:
//   MAPBOX_ACCESS_TOKEN
//   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN   (preferred — also exposed to web client)
//   NEXT_PUBLIC_MAPBOX_TOKEN
//   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
//
// The token is a PUBLIC token (pk.*) from https://account.mapbox.com/access-tokens/
// ============================================

function looksValid(token: string | undefined): token is string {
  if (!token) return false;
  if (token.length <= 10) return false;
  if (!token.startsWith('pk.')) return false;
  if (token.includes('your-token-here') || token.includes('xxxx')) return false;
  return true;
}

/**
 * Get the Mapbox access token for server-side API calls.
 * Reads from environment variables. Returns empty string if not configured.
 */
export function getMapboxToken(): string {
  const envToken =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (looksValid(envToken)) {
    return envToken;
  }
  return '';
}
