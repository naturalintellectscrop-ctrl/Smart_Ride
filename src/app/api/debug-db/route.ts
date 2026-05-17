/**
 * GET /api/debug-db
 * Debug endpoint to diagnose DATABASE_URL issues
 * Only shows partial info for security
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';

  const info: Record<string, unknown> = {
    hasDatabaseUrl: !!dbUrl,
    urlLength: dbUrl.length,
    urlStartsWith: dbUrl.substring(0, 15) + '...',
  };

  // Check URL structure
  try {
    const parsed = new URL(dbUrl);
    info.urlParsable = true;
    info.protocol = parsed.protocol;
    info.username = parsed.username.substring(0, 10) + '...';
    info.passwordLength = (parsed.password || '').length;
    info.passwordHasSpecialChars = /[?$&#*]/.test(decodeURIComponent(parsed.password || ''));
    info.hostname = parsed.hostname;
    info.port = parsed.port;
    info.pathname = parsed.pathname;
    info.search = parsed.search.substring(0, 30);
  } catch (e) {
    info.urlParsable = false;
    info.parseError = (e as Error).message;

    // Try manual parsing
    const schemeEnd = dbUrl.indexOf('://');
    if (schemeEnd !== -1) {
      const afterScheme = dbUrl.substring(schemeEnd + 3);
      const atCount = (afterScheme.match(/@/g) || []).length;
      info.atSignCount = atCount;

      // Find the @ before the host
      const hostPattern = /@([a-zA-Z0-9][\w.-]*\.\w+)/;
      const hostMatch = afterScheme.match(hostPattern);
      if (hostMatch) {
        const hostStart = afterScheme.indexOf(hostMatch[0]);
        const credentialsPart = afterScheme.substring(0, hostStart);
        const colonIndex = credentialsPart.indexOf(':');
        if (colonIndex !== -1) {
          info.manualUsername = credentialsPart.substring(0, colonIndex).substring(0, 10) + '...';
          const rawPassword = credentialsPart.substring(colonIndex + 1);
          info.manualPasswordLength = rawPassword.length;
          info.manualPasswordHasSpecialChars = /[?$&#*]/.test(rawPassword);
          info.manualEncodedPasswordLength = encodeURIComponent(rawPassword).length;
        }
        info.manualHostname = hostMatch[1];
      }
    }
  }

  // Check individual DB vars
  info.individualVars = {
    DB_HOST: process.env.DB_HOST ? 'set' : 'not set',
    DB_USER: process.env.DB_USER ? 'set' : 'not set',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'set' : 'not set',
    DB_NAME: process.env.DB_NAME ? 'set' : 'not set',
    DB_PORT: process.env.DB_PORT || 'not set',
  };

  return NextResponse.json({ info });
}
