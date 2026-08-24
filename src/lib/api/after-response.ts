import { after } from 'next/server';
import { setServiceRoleContext } from '@/lib/db';

/**
 * Run work after the response has been sent, without losing it.
 *
 * A bare floating promise does not survive here. Two things kill it:
 *
 *  1. **The runtime freezes the invocation when the response returns.** On
 *     Vercel a serverless function is suspended the moment it answers, so a
 *     `doThing().then(…)` started just before `return NextResponse.json(…)`
 *     may never run its callback — and it fails silently, because there is
 *     nobody left to catch anything.
 *
 *  2. **The route's own `finally` pulls the database context out from under
 *     it.** Almost every route ends `finally { await resetRLSContext() }`, and
 *     with `connection_limit=1` that RESET lands on the same connection the
 *     floating work is using. Its next query then dies on 42704
 *     "unrecognized configuration parameter app.current_user_id".
 *
 * `after()` fixes the first by keeping the invocation alive until the callback
 * finishes. Establishing a fresh service-role context inside the callback fixes
 * the second, because the job no longer inherits whatever the request left
 * behind.
 *
 * Observed cost of not doing this: marking a merchant order READY created and
 * priced the delivery task correctly, moved it to MATCHING — and produced no
 * DispatchMatch, no SEARCHING transition and no audit entry, with an eligible
 * courier online at that moment. The task sat in MATCHING forever. The same
 * shape sat on ride booking and on pharmacy dispatch.
 *
 * Outside a request scope (cron, scripts) `after()` throws; the work then runs
 * inline, which is correct there because nothing is about to be frozen.
 *
 * The job must be self-contained: it cannot rely on the request's auth context,
 * and its errors are logged rather than propagated — the response has already
 * gone.
 */
export function runAfterResponse(label: string, job: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await setServiceRoleContext();
      await job();
    } catch (err) {
      console.error(`[after] ${label} failed:`, err);
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }
}
