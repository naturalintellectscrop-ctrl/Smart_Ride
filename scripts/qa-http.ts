/**
 * Shared HTTP helpers for the verification suites.
 *
 * The one thing worth explaining here is the login retry.
 *
 * `/auth/login` allows 5 attempts per 15 minutes per IP. That is a real
 * control and it works. It also means a machine running these suites back to
 * back spends its budget almost immediately — a suite that needs seven
 * signed-in parties trips it part way through and dies with a 429 that says
 * nothing about the thing under test.
 *
 * Two wrong answers were considered and rejected:
 *
 *   - Raising the limit to suit the tests. That weakens a defence for the
 *     convenience of the test suite, which is backwards.
 *   - Signing tokens locally with `generateAccessToken`. Tried; it does not
 *     work, and should not: `JWT_SECRET` is not set in this environment, so
 *     the signer falls back to the development secret and production rejects
 *     the result. The control working is the correct outcome.
 *
 * So the suites wait. A cold limiter makes them slow and nothing else.
 */

export const API = process.env.QA_API ?? 'https://smartrideug.vercel.app/api';

/** How long to wait when the limiter answers, and how many times to try. */
const RETRY_WAIT_MS = 3 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function qaLogin(email: string, password: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (r.status === 429) {
      console.log(
        `    (login rate-limited — 5 per 15min per IP. Waiting ${RETRY_WAIT_MS / 60000}m, ` +
        `attempt ${attempt}/${MAX_ATTEMPTS})`
      );
      await new Promise((res) => setTimeout(res, RETRY_WAIT_MS));
      continue;
    }

    const j = await r.json().catch(() => ({}));
    const token = (j as { data?: { accessToken?: string } })?.data?.accessToken;
    if (!token) throw new Error(`login ${email}: HTTP ${r.status}`);
    return token;
  }
  throw new Error(`login ${email}: still rate-limited after ${MAX_ATTEMPTS} attempts`);
}

/** An authenticated (or anonymous, if no token) request maker. */
export const qaCall = (token?: string) =>
  (path: string, method = 'GET', body?: unknown) =>
    fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
