/**
 * BE-004 — does the UI claim security properties the backend does not provide?
 *
 * A false security claim is worse than no claim. Ride tracking promotes in-app
 * chat as the privacy-safe alternative to sharing a phone number, so a badge
 * reading "End-to-end encrypted" could plausibly decide what a user sends —
 * an address, an ID number, payment details.
 *
 * This scans every user-facing surface for claims that are not true of this
 * system, so a removed claim cannot quietly come back in a later redesign.
 *
 *   bun scripts/verify-security-claims.ts
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

/**
 * Claims that are false for this system, with why. Matched against user-facing
 * text only — the explanatory comments that record WHY a claim was removed are
 * stripped first, or this would flag its own documentation.
 */
const BANNED_CLAIMS: Array<{ pattern: RegExp; why: string }> = [
  {
    pattern: /end[-\s]?to[-\s]?end encrypt/i,
    why: 'Message.content is a plain String column; no crypto library is installed and no key exchange exists',
  },
  {
    pattern: /\bE2EE\b/,
    why: 'same as end-to-end encrypted — the property does not exist',
  },
  {
    pattern: /encrypted image storage/i,
    why: 'prescription images are stored as a plain URL; imageHash is a timestamp, not a digest',
  },
  {
    pattern: /zero[-\s]?knowledge/i,
    why: 'the server reads every field it stores',
  },
  {
    pattern: /we cannot read your messages/i,
    why: 'the server can read every message',
  },
];

const UI_ROOTS = [
  'src/app',
  'src/components',
  'expo-app/app',
  'expo-app/src',
];

const UI_EXTENSIONS = ['.tsx', '.ts'];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue;
    const full = join(dir, e);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(full, out);
    else if (UI_EXTENSIONS.some(x => e.endsWith(x))) out.push(full);
  }
  return out;
}

/**
 * Remove comments so the notes explaining why a claim was removed do not
 * themselves trip the scanner. Only what a user could see is checked.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ');
}

function main() {
  console.log('\n=== Security Claims (BE-004) ===');

  stage('STAGE 1  no surface claims a property the backend lacks');

  const files = UI_ROOTS.flatMap(r => walk(r));
  console.log(`  scanning ${files.length} UI file(s) across ${UI_ROOTS.length} roots`);

  for (const { pattern, why } of BANNED_CLAIMS) {
    const hits: string[] = [];
    for (const f of files) {
      const visible = stripComments(readFileSync(f, 'utf8'));
      if (pattern.test(visible)) hits.push(f.replace(/\\/g, '/'));
    }
    check(
      `no surface claims ${pattern.source.slice(0, 42)}`,
      hits.length === 0,
      hits.length ? `CLAIMED IN: ${hits.join(', ')} — ${why}` : why
    );
  }

  stage('STAGE 2  the claims that replaced them are true');

  // The replacement wording must assert only what actually holds: contact
  // details really are withheld, and chat really is in-app only.
  const chatSurfaces = [
    'expo-app/app/chat/[id].tsx',
    'src/components/smart-ride/messaging/enhanced-messaging-screen.tsx',
    'src/components/smart-ride/messaging/messaging-screen.tsx',
  ];
  for (const f of chatSurfaces) {
    let src = '';
    try {
      src = readFileSync(f, 'utf8');
    } catch {
      check(`chat surface present: ${f}`, false, 'file not found');
      continue;
    }
    check(
      `${f.split('/').pop()} states a property that holds`,
      /stay private/i.test(src) && /in-app only/i.test(src),
      'claims contact privacy, not encryption'
    );
  }

  // Contact redaction is the mechanism behind that claim. If it disappeared,
  // the replacement wording would become false in turn.
  let redaction = '';
  try {
    redaction = readFileSync('src/lib/privacy/public-contact.ts', 'utf8');
  } catch {
    /* reported below */
  }
  check(
    'contact redaction actually exists to back the claim',
    redaction.includes('redactPerson'),
    redaction ? 'src/lib/privacy/public-contact.ts exports redactPerson' : 'redaction helper missing'
  );

  stage('STAGE 3  other privacy claims found in the audit hold up');

  // "Phone numbers are never shared" (in-app-communication.tsx) and
  // "Your data is protected and never shared" (register.tsx). The mechanism
  // is redactPerson, applied route by route — so the claim is only as true as
  // its coverage. Asserted as a floor, so a mass removal is caught.
  const apiFiles = walk('src/app/api');
  const redacting = apiFiles.filter(f => readFileSync(f, 'utf8').includes('redactPerson'));
  // These are the routes that hand one party's details to another — tasks,
  // orders, and the offline cache built from them. They are the whole surface
  // where a phone number could leak to a counterparty, so all of them must
  // redact. Named individually rather than counted, so moving a route out of
  // the set is a visible decision instead of a number quietly dropping.
  const MUST_REDACT = [
    'offline/cache/route.ts',
    'orders/route.ts',
    'orders/[id]/route.ts',
    'tasks/active/route.ts',
    'tasks/available/route.ts',
    'tasks/route.ts',
    'tasks/[id]/route.ts',
  ];
  const redactingSet = new Set(redacting.map(f => f.split('\\').join('/')));
  const missing = MUST_REDACT.filter(
    r => ![...redactingSet].some(f => f.endsWith(r))
  );
  check(
    '"phone numbers are never shared" — every counterparty route redacts',
    missing.length === 0,
    missing.length
      ? `NOT REDACTING: ${missing.join(', ')}`
      : `all ${MUST_REDACT.length} counterparty-exposing routes call redactPerson`
  );

  const redactSrc = readFileSync('src/lib/privacy/public-contact.ts', 'utf8');
  check(
    'redaction actually removes phone AND email, not just the surname',
    /for \(const k of \['phone', 'email'\]\)/.test(redactSrc) && redactSrc.includes('delete'),
    'both contact fields are deleted from the payload'
  );

  // "Your rating and tip are private" (trip-summary-rating-screen.tsx).
  // Private means the driver cannot see who rated them.
  const exposesRater = apiFiles.filter(f => {
    const src = readFileSync(f, 'utf8');
    return /fromUser\s*:\s*\{/.test(src) || /include:[\s\S]{0,200}fromUser/.test(src);
  });
  check(
    '"your rating is private" — no API route joins the rater onto a rating',
    exposesRater.length === 0,
    exposesRater.length
      ? `EXPOSED IN: ${exposesRater.map(f => f.split('\\').join('/')).join(', ')}`
      : 'ratings are never returned with the rater attached'
  );

  stage('STAGE 4  claims that ARE true are left alone');

  // Stated for the record: these survive the audit deliberately.
  const otp = readFileSync('src/lib/auth/otp-service.ts', 'utf8');
  check(
    'the OTP screen may say codes are not stored readably',
    otp.includes('bcryptjs') && otp.includes('otpHash'),
    'OTP is bcrypt-hashed before storage, so the claim holds'
  );

  console.log(
    failures === 0
      ? '\n=== EVERY SECURITY CLAIM IS BACKED BY AN IMPLEMENTATION ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
