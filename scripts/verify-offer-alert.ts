/**
 * A ride offer has to be AUDIBLE.
 *
 * A driver is looking at the road, not the screen, and an offer expires in
 * seconds. The app already vibrated and already sent a notification saying
 * `sound: true` — but on Android 8+ the sound, the vibration and the heads-up
 * banner are properties of the notification CHANNEL, not the payload, and no
 * channel had ever been created. Every alert landed on the implicit default
 * channel, so `sound: true` was quietly ignored and a job offer arrived with
 * the same tick as a promotional message.
 *
 * These checks are static — an alert that only exists on a device cannot be
 * asserted from here — but they hold the chain together: a channel is created,
 * it is loud, and every path that announces an offer routes onto it.
 *
 *   bun scripts/verify-offer-alert.ts
 */

import { readFileSync } from 'fs';

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

function read(p: string): string {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  console.log('\n=== Ride Offer Alert ===');

  const channels = read('expo-app/src/services/notification-channels.ts');
  const layout = read('expo-app/app/_layout.tsx');
  const driver = read('expo-app/app/driver/index.tsx');
  const push = read('src/lib/services/push-notification.service.ts');
  const dispatch = read('src/lib/services/dispatch-persistence.service.ts');

  // ── 1. The channel exists and is loud ────────────────────────────
  stage('STAGE 1  an offer channel exists and is configured to ring');

  check(
    'a dedicated ride-offer channel is defined',
    channels.includes('CHANNEL_RIDE_OFFERS') &&
      channels.includes('setNotificationChannelAsync'),
    channels ? 'notification-channels.ts defines the offer channel' : 'file missing'
  );
  check(
    'the offer channel is MAX importance, not DEFAULT',
    /CHANNEL_RIDE_OFFERS[\s\S]{0,600}AndroidImportance\.MAX/.test(channels),
    'MAX is what earns a heads-up banner and a full-attention sound'
  );
  check(
    'the offer channel carries a sound',
    /CHANNEL_RIDE_OFFERS[\s\S]{0,600}sound:\s*'default'/.test(channels),
    'sound is a channel property on Android; the payload field alone does nothing'
  );
  check(
    'the offer channel vibrates with a distinct pattern',
    /CHANNEL_RIDE_OFFERS[\s\S]{0,600}vibrationPattern/.test(channels) &&
      channels.includes('OFFER_VIBRATION_PATTERN'),
    'a driver can tell an offer from an ordinary notification without looking'
  );
  check(
    'an offer can break through Do Not Disturb',
    /CHANNEL_RIDE_OFFERS[\s\S]{0,700}bypassDnd:\s*true/.test(channels),
    'a working driver has DND on more often than not'
  );

  // Ordinary traffic must NOT be as loud, or the offer stops standing out.
  check(
    'general notifications are quieter than offers',
    /CHANNEL_GENERAL[\s\S]{0,500}AndroidImportance\.DEFAULT/.test(channels),
    'receipts and promos do not ring like a job'
  );

  // ── 2. Channels are actually created ─────────────────────────────
  stage('STAGE 2  the channel is created before anything can fire');

  check(
    'channels are configured at app launch',
    layout.includes('configureNotificationChannels'),
    '_layout.tsx calls it at module scope, before any notification is scheduled'
  );
  check(
    'the foreground handler still allows sound',
    /shouldPlaySound:\s*true/.test(layout),
    'without this a foregrounded app suppresses the alert entirely'
  );
  check(
    'channel setup cannot crash the launch',
    /configureNotificationChannels[\s\S]*?catch/.test(channels),
    'a driver would rather have a silent offer than no app'
  );

  // ── 3. Foreground: the in-app ring ───────────────────────────────
  stage('STAGE 3  an offer rings while the app is open');

  check(
    'the in-app offer alert routes onto the offer channel',
    driver.includes('CHANNEL_RIDE_OFFERS'),
    'driver/index.tsx names the channel on its notification'
  );
  check(
    'the alert repeats until the offer is answered',
    /ring\(\);\s*const interval = setInterval\(ring/.test(driver),
    'one ring is missable; it repeats on an interval and clears on answer/expiry'
  );
  check(
    'the repeat is cleaned up so it cannot ring forever',
    /return \(\) => clearInterval\(interval\)/.test(driver),
    'the interval is cleared when the offer goes away'
  );
  check(
    'sound and vibration both fire, not one or the other',
    driver.includes('OFFER_VIBRATION_PATTERN') && driver.includes('sound: true'),
    'a driver in traffic may not hear it; one with the phone mounted may not feel it'
  );
  check(
    'the very first buzz fires the instant the offer arrives',
    /handleIncomingRequest[\s\S]{0,600}Vibration\.vibrate\(OFFER_VIBRATION_PATTERN\)/.test(driver),
    'not delayed until the repeating effect schedules its first tick'
  );

  // ── 4. Background: the push ──────────────────────────────────────
  stage('STAGE 4  an offer rings when the app is backgrounded');

  check(
    'the push payload can carry a channel',
    push.includes('channelId?: PushChannel') && push.includes('PushChannel'),
    'typed, so a caller cannot invent a channel the app never created'
  );
  check(
    'Expo push messages send the channel through',
    /channelId:\s*payload\.channelId\s*\?\?\s*CHANNEL_GENERAL/.test(push),
    'defaults to the quiet channel — loud is opt-in, per notification'
  );
  check(
    'THE DISPATCH OFFER PUSH USES THE LOUD CHANNEL',
    /New ride request[\s\S]{0,600}channelId:\s*CHANNEL_RIDE_OFFERS/.test(dispatch),
    'this is the push that wakes a driver whose app is closed'
  );

  // The two sides must agree on the literal id, or Android silently drops the
  // notification onto the default channel and the whole chain is undone.
  const appIds = [...channels.matchAll(/'([a-z-]+-v\d+)'/g)].map(m => m[1]);
  const serverIds = [...push.matchAll(/'([a-z-]+-v\d+)'/g)].map(m => m[1]);
  const mismatched = serverIds.filter(id => !appIds.includes(id));
  check(
    'server and app agree on the channel ids',
    mismatched.length === 0 && serverIds.length > 0,
    mismatched.length
      ? `SERVER USES UNKNOWN CHANNEL(S): ${mismatched.join(', ')}`
      : `${serverIds.length} id(s) match: ${serverIds.join(', ')}`
  );

  console.log(
    failures === 0
      ? '\n=== A RIDE OFFER IS AUDIBLE ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
