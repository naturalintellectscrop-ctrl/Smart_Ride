/**
 * Does a pharmacy's own action actually reach a customer's app?
 *
 * Subscribes to the storefront channel with the MOBILE APP's own credentials —
 * so this proves the path a customer's phone really uses — then drives the
 * pharmacy from the production API and waits for the broadcasts.
 *
 *   bun scripts/.qa-realtime.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const API = 'https://smartrideug.vercel.app/api';

const envFile = fs.readFileSync('expo-app/.env', 'utf8');
function readEnv(key: string): string {
  const line = envFile.split(/\r?\n/).find((l) => l.startsWith(key + '='));
  return line ? line.slice(key.length + 1).trim() : '';
}
const SUPABASE_URL = readEnv('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_* in expo-app/.env');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync('scripts/.qa-pharm-chain.json', 'utf8'));
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const received: any[] = [];
  const channel = supabase.channel('storefront');
  for (const ev of [
    'provider:availability',
    'provider:catalog',
    'merchant:availability',
    'merchant:menu',
  ]) {
    channel.on('broadcast', { event: ev }, (p: any) => {
      received.push({ event: ev, ...p.payload });
      console.log(`  <-- ${ev}  ${JSON.stringify(p.payload)}`);
    });
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('subscribe timed out')), 20000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  console.log('\n=== STOREFRONT REALTIME ===\n');
  console.log('subscribed exactly as a customer app does\n');

  const lr = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: state.pharmEmail, password: state.pharmPass }),
  });
  const token = (await lr.json())?.data?.accessToken;
  if (!token) throw new Error('pharmacy login failed');

  const call = (p: string, method: string, body?: unknown) =>
    fetch(`${API}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  console.log('the pharmacy closes...');
  await call('/health-provider/status', 'PATCH', { isOpen: false });
  await wait(4000);

  console.log('the pharmacy opens...');
  await call('/health-provider/status', 'PATCH', { isOpen: true });
  await wait(4000);

  console.log('the pharmacy stocks a new medicine...');
  const add = await call('/health-provider/catalog', 'POST', {
    name: 'QA Realtime Syrup',
    price: 7000,
    stockQuantity: 5,
  });
  const med = (await add.json())?.medicine;
  await wait(4000);

  if (med?.id) {
    console.log('the pharmacy marks it out of stock...');
    await call('/health-provider/catalog', 'PATCH', { medicineId: med.id, isAvailable: false });
    await wait(4000);

    console.log('the pharmacy removes it...');
    await call(`/health-provider/catalog?medicineId=${med.id}`, 'DELETE');
    await wait(4000);
  }

  console.log('');
  const closed = received.find((r) => r.event === 'provider:availability' && r.isOpen === false);
  const opened = received.find((r) => r.event === 'provider:availability' && r.isOpen === true);
  const added = received.find((r) => r.event === 'provider:catalog' && r.change === 'ADDED');
  const updated = received.find((r) => r.event === 'provider:catalog' && r.change === 'UPDATED');
  const removed = received.find((r) => r.event === 'provider:catalog' && r.change === 'REMOVED');

  ok('closing reaches the customer app', !!closed, closed?.businessName ?? '');
  ok('opening reaches the customer app', !!opened);
  ok('a new medicine reaches the customer app', !!added, added?.name ?? '');
  ok(
    'going out of stock reaches the customer app',
    !!updated && updated.isAvailable === false,
    String(updated?.isAvailable)
  );
  ok('removing a medicine reaches the customer app', !!removed);
  ok('the payload carries the new state, not just a ping', !!closed?.at && !!added?.price);

  console.log(`\n=== ${pass}/${pass + fail} passed · ${received.length} events received ===`);
  await supabase.removeChannel(channel);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
