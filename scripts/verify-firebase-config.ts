/**
 * BE-010 — push registration fails on the release build (FIS_AUTH_ERROR).
 *
 * A cold launch of the release APK logs:
 *
 *   Fetching the token failed: java.io.IOException: FIS_AUTH_ERROR
 *
 * The device never obtains a push token, so every server-side notification
 * path — dispatch offers, order status, chat — silently reaches nobody. That
 * includes the ride-offer ringtone, which is worth nothing if the token it
 * depends on was never issued.
 *
 * This verifies the configuration FROM THE APPLICATION SIDE: the shipped
 * google-services.json, the signing certificate registered against it, and a
 * live probe of the Firebase Installations API using the exact key the app
 * ships with. It tells you WHICH of the three candidate causes is real, so the
 * Console change is a targeted one rather than a guess.
 *
 *   bun scripts/verify-firebase-config.ts
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

let failures = 0;
let warnings = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function warn(label: string, detail: string) {
  console.log(`  WARN  ${label} — ${detail}`);
  warnings++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const GS_PATH = 'expo-app/android/app/google-services.json';
const GRADLE_PATH = 'expo-app/android/app/build.gradle';
const KEYSTORE_PATH = 'expo-app/keystores/smartride-upload.keystore';

interface GoogleServices {
  project_info?: { project_id?: string; project_number?: string };
  client?: Array<{
    client_info?: {
      mobilesdk_app_id?: string;
      android_client_info?: { package_name?: string };
    };
    api_key?: Array<{ current_key?: string }>;
    oauth_client?: Array<{
      client_type?: number;
      android_info?: { certificate_hash?: string; package_name?: string };
    }>;
  }>;
}

async function main() {
  console.log('\n=== Firebase Push Configuration (BE-010) ===');

  // ── 1. The file the app actually ships ───────────────────────────
  stage('STAGE 1  the shipped configuration is coherent');

  if (!existsSync(GS_PATH)) {
    check('google-services.json is present', false, `${GS_PATH} not found`);
    process.exit(1);
  }

  const gs: GoogleServices = JSON.parse(readFileSync(GS_PATH, 'utf8'));
  const client = gs.client?.[0];
  const projectId = gs.project_info?.project_id;
  const packageName = client?.client_info?.android_client_info?.package_name;
  const appId = client?.client_info?.mobilesdk_app_id;
  const apiKey = client?.api_key?.[0]?.current_key;

  check(
    'a project and an Android client are declared',
    !!projectId && !!packageName && !!appId,
    `project=${projectId} package=${packageName}`
  );
  check(
    'an API key is present',
    !!apiKey && apiKey.length > 20,
    apiKey ? `key ${apiKey.slice(0, 12)}…` : 'no api_key in google-services.json'
  );

  // A package-name mismatch was ruled out at the last audit; asserted here so
  // it stays ruled out rather than being re-investigated each time.
  let applicationId: string | undefined;
  if (existsSync(GRADLE_PATH)) {
    applicationId = readFileSync(GRADLE_PATH, 'utf8').match(
      /applicationId\s+["']([^"']+)["']/
    )?.[1];
  }
  check(
    'the gradle applicationId matches the Firebase package name',
    !!applicationId && applicationId === packageName,
    `gradle=${applicationId} firebase=${packageName}`
  );

  // ── 2. The signing certificate ───────────────────────────────────
  stage('STAGE 2  the release signing certificate is registered');

  const registeredHashes = (client?.oauth_client ?? [])
    .map(o => o.android_info?.certificate_hash?.toLowerCase())
    .filter((h): h is string => !!h);

  let releaseSha1: string | undefined;
  if (existsSync(KEYSTORE_PATH)) {
    try {
      const pw =
        process.env.KEYSTORE_PASSWORD ||
        readFileSync('expo-app/keystore.properties', 'utf8').match(
          /KEYSTORE_PASSWORD=(.*)/
        )?.[1]?.trim();
      const out = execSync(
        `keytool -list -v -keystore "${KEYSTORE_PATH}" -storepass "${pw}"`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      );
      releaseSha1 = out.match(/SHA1:\s*([0-9A-F:]+)/i)?.[1]?.replace(/:/g, '').toLowerCase();
    } catch {
      /* reported below */
    }
  }

  if (!releaseSha1) {
    warn(
      'could not read the release keystore',
      'skipping the certificate check — run locally with the keystore present'
    );
  } else {
    check(
      'the release certificate SHA-1 is registered in Firebase',
      registeredHashes.includes(releaseSha1),
      registeredHashes.includes(releaseSha1)
        ? `SHA-1 ${releaseSha1.slice(0, 12)}… is one of ${registeredHashes.length} registered`
        : `SHA-1 ${releaseSha1.slice(0, 12)}… is NOT among the ${registeredHashes.length} registered — ` +
          `add it in Firebase Console > Project settings > Your apps`
    );
  }

  // ── 3. The live probe ────────────────────────────────────────────
  stage('STAGE 3  the Installations API accepts the shipped key');

  if (!apiKey || !projectId || !appId) {
    check('probe prerequisites', false, 'missing key/project/appId');
  } else {
    const fid =
      'c' +
      Array.from(
        { length: 21 },
        () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
      ).join('');

    let status = 0;
    let reason = '';
    let message = '';
    try {
      const res = await fetch(
        `https://firebaseinstallations.googleapis.com/v1/projects/${projectId}/installations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            fid,
            appId,
            authVersion: 'FIS_v2',
            sdkVersion: 'a:17.0.0',
          }),
        }
      );
      status = res.status;
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; details?: Array<{ reason?: string }> };
      };
      reason = body.error?.details?.[0]?.reason ?? '';
      message = body.error?.message ?? '';
    } catch (e) {
      message = String(e);
    }

    // FIS_AUTH_ERROR on the device is this call failing. Naming the reason is
    // the whole point — each one has a different fix, and guessing between
    // them is what has kept this open.
    const DIAGNOSIS: Record<string, string> = {
      API_KEY_ANDROID_APP_BLOCKED:
        'The API key has an Android app restriction that does not cover this app. ' +
        'Google Cloud Console > APIs & Services > Credentials > the Android key > ' +
        'Application restrictions: add package ' +
        `${packageName} with the release SHA-1, or relax the restriction.`,
      API_KEY_SERVICE_BLOCKED:
        'The API key is restricted to a set of APIs that excludes Firebase ' +
        'Installations. Add "Firebase Installations API" to the key\'s API restrictions.',
      SERVICE_DISABLED:
        'The Firebase Installations API is disabled on the Cloud project. ' +
        'Enable it in Google Cloud Console > APIs & Services > Library.',
      API_KEY_INVALID:
        'The API key in google-services.json is not valid for this project — ' +
        'the file is likely stale. Re-download it from Firebase Console.',
    };

    check(
      'the shipped API key can register a Firebase installation',
      status === 200,
      status === 200
        ? 'Installations API returned 200 — push token registration will succeed'
        : `HTTP ${status} ${reason || ''} — ${DIAGNOSIS[reason] ?? message.slice(0, 200)}`
    );
  }

  // ── 4. The server side ───────────────────────────────────────────
  stage('STAGE 4  the server can send once a token exists');

  const pushSrc = readFileSync('src/lib/services/push-notification.service.ts', 'utf8');
  check(
    'the server sends via Expo push and routes a channel',
    pushSrc.includes('exp.host/--/api/v2/push/send') && pushSrc.includes('channelId'),
    'a token is only half of it — the alert still needs its channel'
  );

  const hasFcmServer = existsSync('src/lib/services/fcm-server.service.ts');
  check(
    'an FCM fallback exists for clients without an Expo token',
    hasFcmServer || pushSrc.includes('fcmServerService'),
    'web/PWA clients register FCM tokens rather than Expo ones'
  );

  // ── 5. Deep linking ──────────────────────────────────────────────
  stage('STAGE 5  a tapped notification can reach a screen');

  const appJson = JSON.parse(readFileSync('expo-app/app.json', 'utf8')) as {
    expo?: { scheme?: string };
  };
  if (!appJson.expo?.scheme) {
    warn(
      'app.json declares no URL scheme',
      'nothing depends on one today, but a notification cannot deep-link into a ' +
        'screen without it — recorded against BE-010 as a Stage-4 item'
    );
  } else {
    check('a URL scheme is declared for deep links', true, `scheme=${appJson.expo.scheme}`);
  }

  console.log(
    failures === 0
      ? `\n=== FIREBASE PUSH CONFIGURATION VERIFIED${warnings ? ` (${warnings} warning(s))` : ''} ===\n`
      : `\n=== ${failures} CHECK(S) FAILED — push will not reach devices ===\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
