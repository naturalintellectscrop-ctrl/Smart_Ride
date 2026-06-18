# NP-1 — NylonPay Integration Research & Technical Guide for Smart Ride

> **Research-only artifact.** No project code was modified. This document captures the full public NylonPay documentation surface and maps it onto a concrete integration plan for the Smart Ride super-app (Expo Router mobile + Next.js backend + Supabase PostgreSQL + Prisma).
>
> **Source:** https://docs.nylonpay.nilesquad.com/docs (Fumadocs SPA — captured via agent-browser on 2026-06-18)
> **Captured pages:** 24 (full sidebar tree: 4 Getting Started + 9 SDK + 3 Concepts + 4 Guides + 3 Coverage + 2 Reference)
> **SDK package:** `@nile-squad/nylonpay-ts` (TypeScript reference implementation; only SDK currently shipped)

---

## 1. Overview — What NylonPay Is

NylonPay is a **payments API for Africa** built by Nile Squad. It exposes one server-side SDK that abstracts:

- **Mobile Money collections** — MTN MoMo and Airtel Money (Uganda today; Kenya + Tanzania on the roadmap)
- **Bank transfers** — 25+ banks (used for both collection and settlement)
- **Cards** — Visa, **Africa-issued only**, KYC Level 2 required (international cards coming soon)
- **Payouts / settlements** — disbursements from your NylonPay balance to mobile money wallets or bank accounts
- **Hosted payment links** — invoice-based, shareable URL, no checkout UI required
- **Webhooks** — real-time transaction status push with HMAC signature verification + replay protection
- **Sandbox** — full test environment with same API surface; success/failure simulated automatically
- **Addon services** — SMS notifications (50 UGX/SMS), email receipts (free), auto-invoicing (free), EFRIS tax resolution, cross-border payments (+2%), subscription payments (+0.5%)

The SDK is the **only supported integration path**. The docs explicitly state: *"Use the SDK, not direct REST API calls. The SDK handles signing, retries, types, and error handling automatically."* No public REST endpoint documentation is published — all signing, polling, and signature verification is encapsulated in the SDK. A custom `fetch` can be injected for edge runtimes.

### Supported SDK languages
| Language | Status | Expected Release |
|---|---|---|
| **TypeScript** (`@nile-squad/nylonpay-ts`) | Available now (reference impl) | — |
| Python | In Development | Q3 2026 |
| Go | In Development | Q3 2026 |
| Rust / C# | Planned | Q4 2026 |
| PHP / Java / Kotlin | Planned | Q1 2027 |
| Elixir | Planned | Q2 2027 |

All SDKs follow the same API spec with language-idiomatic naming (e.g., `collectPayment` in TS → `collect_payment` in Python).

### Supported currencies
`USD | EUR | GBP | KES | UGX | TZS | RWF` — seven currencies through a single integration.

---

## 2. Authentication

### Credential model — API key + API secret (HMAC signing)

NylonPay uses a **public `apiKey` + private `apiSecret`** pair. The `apiKey` identifies the account; the `apiSecret` signs every request. The SDK handles signing and response verification automatically — there is **no manual HMAC code** to write and **no Bearer/OAuth token endpoint** to call (unlike MTN MoMo's OAuth2 access-token flow).

| Credential | Prefix | Purpose |
|---|---|---|
| `apiKey` | `npk_sandbox_…`, `npk_live_…`, `npk_test_…` | Public key, identifies the account |
| `apiSecret` | `nps_sandbox_…`, `nps_live_…`, `nps_test_…` | Private key, signs every request |
| Webhook secret | (separate value, set per webhook endpoint in dashboard) | Verifies webhook HMAC signatures |

> **Note on prefix inconsistency:** The Quick Start page uses `npk_sandbox_ / nps_sandbox_`, while the Configuration page uses `npk_test_ / nps_test_` for sandbox and `npk_live_ / nps_live_` for production. The merchant-onboarding page confirms the canonical prefixes are `npk_sandbox_ / nps_sandbox_` and `npk_live_ / nps_live_`. Treat `npk_test_` as an alias of `npk_sandbox_`.

### Where credentials come from
1. Sign up at `nylonpay.nilesquad.com` (email + password + company name, no ID/payment needed).
2. Sandbox keys are available immediately under **Settings → API Keys**. Copy the `apiSecret` at creation time — it is shown **only once**.
3. Live keys (`npk_live_ / nps_live_`) require **Level 1 KYC** (free; government ID via hosted session). Approval takes 1–2 business days.
4. Webhook secret is configured per webhook URL in the dashboard under **Settings → Webhooks** (or **Settings → API Keys** per the onboarding flow).

### Environment selection
**Test vs. live mode is selected by your API key, not by config.** There is no `environment: 'sandbox'` option on `createNylonPay()`. Switching between sandbox and production = swapping the key pair. Sandbox and live credentials are mutually exclusive.

### API key scopes (dashboard-configurable)
- **Send only** — can create payments but cannot read status
- **Receive only** — can check status but cannot create payments
- Optional **IP whitelisting** per key (Dashboard → API Keys → IP Restriction)
- Optional **rate limiting** per key (Dashboard → API Keys)

---

## 3. Base URLs

NylonPay does **not publish a documented public REST base URL** — all traffic flows through the SDK, which internally targets the NylonPay backend. From the docs:

- **Merchant dashboard (account + KYC + API keys + webhooks):** `https://nylonpay.nilesquad.com`
- **Hosted payment page (invoice URLs):** `https://pay.nylonpay.io/<invoice_id>` (e.g. `https://pay.nylonpay.io/inv_abc123xyz`)
- **Backend API base URL:** Embedded in the SDK package (not user-configurable beyond the `force` option for the SDK-instance cache key). The SDK calls NylonPay's backend over HTTPS; the exact hostname is internal.

> **Implication for Smart Ride:** We do **not** need to add a `NYLONPAY_BASE_URL` env var to our app — the SDK owns routing. We only need:
> - `NYLONPAY_API_KEY`
> - `NYLONPAY_API_SECRET`
> - `NYLONPAY_WEBHOOK_SECRET`
> - Optional: `NYLONPAY_MODE` ('sandbox' | 'live') flag for our own logging/metrics (the SDK infers mode from the key, but our app may want to label transactions).

> **Open question Q1:** Confirm with NylonPay support whether the SDK fetches its target URL at runtime or hardcodes it. If hardcoded, we cannot point at a self-hosted/on-prem NylonPay instance. (Not blocking — the SDK is fine for our hosted use case.)

---

## 4. Core SDK / API Flow for Collecting a Payment

### 4.1 Initialize the SDK

```ts
import { createNylonPay } from '@nile-squad/nylonpay-ts';

const nylonpay = createNylonPay({
  apiKey: process.env.NYLONPAY_API_KEY!,     // npk_sandbox_… or npk_live_…
  apiSecret: process.env.NYLONPAY_API_SECRET!, // nps_sandbox_… or nps_live_…
  // Optional tuning:
  timeoutMs: 30_000,          // per-request timeout (default 30s)
  maxRetries: 3,              // transport retries for network failures (default 3)
  maxPollDurationMs: 300_000, // total wait() time (default 5 min)
  maxPollAttempts: 150,       // max polls for wait() (default 150)
  // fetch: customFetch,      // inject for edge runtimes / Deno
  // hooks: { ... },          // see §4.5
});
```

### 4.2 Initiate a collection — `collectPayment(request)`

Returns a `PaymentInstance` immediately. Track status via events or `await payment.wait()`.

#### Request schema (`CollectPaymentInput`)
| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | `number` | yes | Smallest currency unit. For UGX this is the integer shilling amount (UGX has no cents). **Min 500 UGX.** |
| `currency` | `Currency` | yes | `'USD' \| 'EUR' \| 'GBP' \| 'KES' \| 'UGX' \| 'TZS' \| 'RWF'` |
| `description` | `string` | yes | Shown to customer on the payment prompt |
| `customer.name` | `string` | yes | Customer full name |
| `customer.phoneNumber` | `string` | yes | Any common format (`0768…`, `+256768…`, `256768…`, with spaces) — auto-normalized to `256XXXXXXXXX` |
| `customer.email` | `string` | no | Customer email |
| `method` | `PaymentMethod` | no | `'mobileMoney' \| 'bank'`. Omit to let NylonPay route automatically. |
| `reference` | `string` | no | **13–15 characters**, idempotency key. Auto-generated if omitted. UUIDs (36 chars) are rejected. |
| `metadata` | `Record<string, string>` | no | Custom key-value pairs (string values only) |
| `bank` | `BankDetails` | no | `{ accountNumber, bankName }` — for bank-transfer collections |

#### Example
```ts
import { randomBytes } from 'node:crypto';

const payment = await nylonpay.collectPayment({
  amount: 50_000,
  currency: 'UGX',
  description: 'Order #12345',
  customer: {
    name: 'John Doe',
    phoneNumber: '+256700000000',
    email: 'customer@example.com',
  },
  reference: randomBytes(7).toString('hex'), // 14 hex chars — fits 13–15 range
  metadata: {
    orderId: '12345',
    taskType: 'FOOD_DELIVERY',
  },
});

payment.on('success', ({ transaction }) => {
  console.log('Payment completed:', transaction.id, transaction.operatorTid);
});
payment.on('failed', ({ error }) => console.error('Failed:', error));
payment.on('error', ({ error, category, retryable }) =>
  console.error('Lifecycle error:', category, error, { retryable }),
);
```

### 4.3 Payment flow (sequence)

```
Your Server → Nylon Pay Backend → Payment Provider (MTN/Airtel/Bank) → Customer Phone
                                                                        ↓
    ← ← ← ← ← ← ← ← ← ← ← ← ← Status Updates (polling) ← ← ← ← ← ← ← ← ←
         ↓                       ↓                                ↓
    processing             success / failed                   cancelled
```

1. You call `collectPayment()` with customer details and amount.
2. SDK authenticates (signs request) and posts to NylonPay backend.
3. Backend forwards to the payment provider (MTN MoMo, Airtel Money, etc.).
4. Customer receives a USSD/STK prompt on their phone.
5. SDK polls the backend (single-flight, jittered intervals) until a terminal state.
6. Events fire as status changes; `wait()` resolves on terminal state.

### 4.4 `PaymentInstance` API

| Method / property | Description |
|---|---|
| `.on(event, handler)` | Listen for `processing \| success \| failed \| cancelled \| error` events. Chainable. |
| `.once(event, handler)` | Listen once, then auto-remove. |
| `.off(event, handler)` | Remove a handler. |
| `.wait()` | `Promise<Transaction \| null>`. Resolves with `Transaction` on success, `null` on failure/cancel/error. **Never rejects.** |
| `.reference` | The transaction reference |
| `.status` | Current `TransactionStatus` |

#### `EventData` shape
```ts
type EventData = {
  event: PaymentEvent;        // 'processing' | 'success' | 'failed' | 'cancelled' | 'error'
  reference: string;          // always present
  transaction?: Transaction;  // present on success/failed/cancelled
  error?: string;             // present on 'error'
  category?: SdkErrorCategory;// present on 'error' — see §10
  retryable?: boolean;        // present on 'error'
  timestamp: string;          // ISO 8601
};
```

#### `Transaction` shape (canonical)
```ts
type Transaction = {
  id: string;
  reference: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;   // 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled'
  type: TransactionType;       // 'collection' | 'payout' | 'transfer' | 'escrow' | 'refund' | 'reversal' | 'charge' | 'chargeback'
  method: PaymentMethod;       // 'mobileMoney' | 'bank'
  description: string;
  operatorTid: string | null;  // telco/bank transaction ID — use to cross-validate customer receipts
  phone: string;               // normalized '256XXXXXXXXX'
  email: string | null;
  failureReason: string | null;
  metadata: Record<string, string>;
  mode: TransactionMode;       // 'test' | 'live'
  createdAt: string;
  updatedAt: string;
};
```

### 4.5 Blocking variant — `collectPaymentAndResolve()`

If you prefer a single blocking call instead of event listeners, use `collectPaymentAndResolve()` — returns a `Result<Transaction, string>` (no events, no polling object). The same `Result` pattern is used by `getStatus`, `getTransaction`, `verifyPhone`, `createInvoice`, `makePayoutAndResolve`.

```ts
const result = await nylonpay.collectPaymentAndResolve({ /* same input */ });
if (result.isOk) {
  console.log(result.value.status);
} else {
  const err = parseError(result.error); // structured SdkError
  console.error(err.category, err.message, err.retryable);
}
```

### 4.6 Hooks (lifecycle interceptors)

Register at initialization. Each hook has `fn`, `onError` (required), `enabled` (default `true`). Hook crashes never break the payment — they're routed to `onError` and the call proceeds with the original payload.

| Hook | Fires | Can mutate payload? |
|---|---|---|
| `beforeCollect` | Before every `collectPayment` / `collectPaymentAndResolve` | Yes (return mutated input) |
| `afterCollect` | After every collect call, success or failure | No (return value ignored) |
| `beforePayout` | Before every `makePayout` / `makePayoutAndResolve` | Yes |
| `afterPayout` | After every payout call | No |

Use for logging, analytics, metadata enrichment, audit trail writes. Async hooks are awaited.

### 4.7 Idempotency rules — IMPORTANT

- `reference` must be **13–15 characters**. Shorter/longer values fail client-side validation immediately (before any network call).
- A raw UUID (36 chars) is **rejected**.
- If you retry a request with the same `reference`, the SDK returns the existing `PaymentInstance` instead of creating a new payment.
- **Never reuse the same reference for different payments.**
- Recommended generation pattern: `randomBytes(7).toString('hex')` (14 hex chars).

### 4.8 Check status — `getStatus(request)`

Pull-model status check. Returns `Result<StatusResponse, string>`.

```ts
const result = await nylonpay.getStatus({ reference: 'ORDER-2026-001' });
if (result.isOk) {
  const { reference, status, amount, currency, updatedAt, operatorTid } = result.value;
}
```

#### `StatusResponse`
```ts
type StatusResponse = {
  reference: string;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  updatedAt: string;
  operatorTid?: string | null;
};
```

**Always verify with `getStatus()` before fulfilling orders** — the docs explicitly recommend this as defense in depth even when webhooks are configured.

### 4.9 Phone verification — `verifyPhone(request)`

Pre-validate a phone number before initiating a payment. Returns the registered account name so you can confirm customer identity.

```ts
const result = await nylonpay.verifyPhone({
  phoneNumber: '+256700000000',
  purpose: 'collection', // or 'payout'
});
if (result.isOk && result.value.verified) {
  console.log('Registered to:', result.value.customerName);
}
```

Returns `PhoneVerification = { phoneNumber, customerName, verified }`.

### 4.10 HTTP method/path/headers — NOT DOCUMENTED

The NylonPay docs deliberately do not publish a REST API surface. There is **no documented `POST /v1/collect` endpoint**, no `Authorization: Bearer …` header, no public base URL. All HTTP semantics (method, path, signature header name, request body shape) are encapsulated in the SDK.

> **Implication:** Smart Ride must integrate via the TypeScript SDK. There is no path to a "raw fetch" integration that bypasses the SDK — and the docs explicitly discourage it.

---

## 5. Payout Flow — `makePayout(request)`

A payout moves funds from your **NylonPay balance** to an external mobile money wallet or bank account. Used for disbursements, supplier payments, refunds, rider/merchant payouts.

> **Settlement model:** Incoming collections credit your NylonPay collection account balance. Payouts draw **from that balance**, not from the customer's payment in real time. Settlement to your own bank/wallet is configured in **Dashboard → Accounts** (settlement phone or bank account; defaults to the phone number used in KYC).

### 5.1 Request schema (`MakePayoutInput`)
| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | `number` | yes | Smallest currency unit. **Min 5,000 UGX.** |
| `currency` | `Currency` | yes | ISO 4217 |
| `description` | `string` | yes | Payout description |
| `customer.name` | `string` | yes | Recipient full name |
| `customer.phoneNumber` | `string` | yes | Recipient phone (auto-normalized) |
| `customer.email` | `string` | no | Recipient email |
| `destination.accountHolderName` | `string` | yes | Name on the receiving account |
| `destination.accountNumber` | `string` | yes | Mobile money number OR bank account number |
| `destination.bankName` | `string` | no | Required for bank account payouts |
| `destination.phone` | `string` | no | Mobile money number when paying to a wallet (auto-normalized) |
| `reference` | `string` | no | 13–15 chars, idempotency key (same rules as collect) |
| `metadata` | `Record<string, string>` | no | Custom data |

### 5.2 Example

```ts
const payout = await nylonpay.makePayout({
  amount: 50_000,
  currency: 'UGX',
  description: 'Rider payout — Task #4471',
  customer: {
    name: 'Jane Doe',
    phoneNumber: '+256700000000',
  },
  destination: {
    accountHolderName: 'Jane Doe',
    accountNumber: '256700000000', // mobile money wallet
    // bankName: 'Stanbic Bank Uganda', // include for bank payouts
  },
  reference: randomBytes(7).toString('hex'),
});

payout.on('success', ({ transaction }) => {
  console.log('Payout delivered:', transaction.id);
});
```

### 5.3 Blocking variant — `makePayoutAndResolve()`

Returns `Result<Transaction, string>`. Same input schema. Use for one-shot payout flows (e.g. admin-triggered batch payouts).

### 5.4 Payout limits

- **Minimum amount:** 5,000 UGX.
- **Maximum:** Bounded by your KYC level + available NylonPay balance.
- Level 1 KYC monthly limit: **10,000,000 UGX**.
- Level 2 KYC monthly limit: **100,000,000 UGX**.
- Settlement/payout availability depends on KYC level + provider.

### 5.5 Payout events

Same `PaymentInstance` event surface as collections: `processing`, `success`, `failed`, `cancelled`, `error`. The `Transaction.type` field will be `'payout'` instead of `'collection'`.

### 5.6 Webhook events for payouts
- `payout.completed` — disbursement reached destination
- `payout.failed` — could not be delivered
- `payout.reversed` — failed settlement was reversed (reconcile funds)

---

## 6. Webhooks

### 6.1 Event types (`WebhookEventType`)

| Event | When | What to do |
|---|---|---|
| `collection.completed` | Customer paid a collection | Fulfill order, send receipt |
| `collection.failed` | Collection was rejected | Notify customer, offer retry |
| `payout.completed` | Disbursement reached destination | Mark payout as settled |
| `payout.failed` | Payout could not be delivered | Investigate destination details |
| `payout.reversed` | Payout was reversed by provider | Reconcile funds |
| `refund.completed` | Refund was processed | Update order state |
| `chargeback.received` | Chargeback was filed | Review dispute evidence |

### 6.2 Payload schema (`WebhookPayload`)

```ts
type WebhookPayload = {
  event: WebhookEventType;
  data: Transaction;          // full Transaction object — see §4.4
  timestamp: string;          // ISO 8601
  signature: string;          // HMAC signature to verify authenticity
};
```

#### Concrete example payload (from docs)
```json
{
  "event": "collection.completed",
  "data": {
    "id": "txn_abc123",
    "reference": "ORDER-001",
    "amount": 50000,
    "currency": "UGX",
    "status": "successful",
    "type": "collection",
    "method": "mobileMoney",
    "description": "Order 001 payment",
    "phone": "+256712345678",
    "email": null,
    "failureReason": null,
    "metadata": {},
    "mode": "test",
    "createdAt": "2026-05-30T10:30:00.000Z",
    "updatedAt": "2026-05-30T10:30:15.000Z"
  },
  "timestamp": "2026-05-30T10:30:15.000Z",
  "signature": "a1b2c3d4e5f6g7h8..."
}
```

### 6.3 Signature verification

Use `verifyWebhookSignature()` from the SDK. It takes the **raw request body** as a string or `Uint8Array`, the `signature` field from the JSON payload, and your **webhook secret** (separate from the API key/secret, configured per webhook URL in the dashboard).

```ts
import { createNylonPay } from '@nile-squad/nylonpay-ts';

const nylonpay = createNylonPay({
  apiKey: process.env.NYLONPAY_API_KEY!,
  apiSecret: process.env.NYLONPAY_API_SECRET!,
});

const isValid = nylonpay.verifyWebhookSignature({
  payload: rawBody,                       // raw request body as string | Uint8Array
  signature: req.body.signature,          // signature field from JSON payload
  secret: process.env.NYLONPAY_WEBHOOK_SECRET!,
  toleranceSeconds: 300,                  // default 300s (5 min); set 0 to disable (NOT recommended)
});
if (!isValid) {
  return res.status(401).send('Invalid signature');
}
```

**Verification does two things:**
1. **HMAC authenticity** — confirms the payload was signed with your webhook secret.
2. **Replay protection** — confirms the signed timestamp inside the body is within `toleranceSeconds` (default 300s = 5 min). A captured webhook cannot be replayed later to re-trigger fulfilment. Every legitimate retry is re-stamped and re-signed by NylonPay, so retries always look fresh.

> **Critical for Smart Ride:** `toleranceSeconds: 0` is documented but discouraged. Keep the default 300s. Also apply your own idempotency layer on top (dedupe on `data.reference` or a delivery ID) — the SDK's replay protection is "defence in depth", not a substitute.

### 6.4 Delivery guarantees & retry behavior

- **At-least-once delivery.** A single event may be sent multiple times — your handler **must** be idempotent.
- Return **HTTP 200 within 5 seconds** to acknowledge. Process asynchronously if you need more time.
- If you don't return 200, NylonPay retries with exponential backoff:

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failures the delivery is marked failed; you can retry from the dashboard.

### 6.5 Idempotency recommendations

```ts
async function handleWebhook(event: WebhookEventType, data: Transaction) {
  // Dedupe on transaction reference (best) or webhook delivery ID
  const processed = await db.get(`processed:${data.reference}:${event}`);
  if (processed) return;
  await processEvent(event, data);
  await db.set(`processed:${data.reference}:${event}`, true);
}
```

### 6.6 Testing webhooks

Sandbox mode delivers webhooks exactly like production. Use ngrok to expose your local server:

```bash
ngrok http 3000
# Then set webhook URL in dashboard to https://<your-ngrok-subdomain>.ngrok.io/api/payments/nylonpay/callback
```

---

## 7. Transaction States / Lifecycle

### 7.1 State machine

```
pending  ──→  processing  ──→  successful
                  │
                  ├──→  failed
                  │
                  └──→  cancelled

pending ──→ cancelled  (explicit cancellation before submission)
```

### 7.2 Status definitions

| Status | Meaning | Terminal? | Can retry? |
|---|---|---|---|
| `pending` | Created in NylonPay, not yet sent to provider | No | N/A |
| `processing` | Submitted to provider, awaiting customer action (PIN prompt, etc.) | No | N/A |
| `successful` | Provider confirmed. Funds moved (or will move shortly). | **Yes** | No |
| `failed` | Provider rejected or customer declined. Common causes: insufficient funds, invalid credentials, provider errors. | **Yes** | Yes (with corrections) |
| `cancelled` | Cancelled before completion (user action, merchant API cancel, or timeout). | **Yes** | No — cannot be restarted |

### 7.3 SDK event → status mapping

| Status change | SDK event | Use case |
|---|---|---|
| Transaction created | (initial state) | Log start |
| `pending → processing` | `payment.on('processing', …)` | Show "Processing" UI |
| `processing → successful` | `payment.on('success', …)` | Fulfill order, show success |
| `processing → failed` | `payment.on('failed', …)` | Show error, offer retry |
| `processing → cancelled` | `payment.on('cancelled', …)` | Show cancellation message |
| Any error | `payment.on('error', …)` | Log error, notify support |

### 7.4 Operator transaction ID (`operatorTid`)

When a payment reaches a terminal state, the `Transaction` may include `operatorTid` — the underlying telco/bank transaction ID. Use this to cross-validate customer payment claims (customer shows receipt → match against `operatorTid`). It is `null` until the operator reports it and may not be available for all payment methods.

### 7.5 Transaction types (orthogonal to status)

`TransactionType = 'collection' | 'payout' | 'transfer' | 'escrow' | 'refund' | 'reversal' | 'charge' | 'chargeback'`

- **collection** — Customer → Merchant
- **payout** — Merchant → External party (disbursement)
- **transfer** — (in type union, not documented in Concepts; assume internal balance transfer)
- **escrow** — (in type union; presumably held funds — not documented)
- **refund** — Merchant-initiated return to customer (full or partial)
- **reversal** — System-initiated undo on failure/timeout — automatic, no merchant action
- **charge** — Platform fee deducted from merchant account
- **chargeback** — Forced reversal by payment network/regulator (can occur days/weeks later)

### 7.6 Map to Smart Ride's existing state machine

Smart Ride's current `PaymentStatus` enum (from `prisma/schema.prisma`):
```
PENDING → PROCESSING → COMPLETED → REFUNDED
                    ↘ FAILED
```

Smart Ride's existing valid transitions (`src/lib/payments/payment-state-machine.ts`):
```
PENDING   → PROCESSING | FAILED
PROCESSING → COMPLETED | FAILED
COMPLETED → REFUNDED
FAILED     → (terminal)
REFUNDED   → (terminal)
```

**Mapping (NylonPay → Smart Ride Prisma):**

| NylonPay status | Smart Ride `PaymentStatus` | Notes |
|---|---|---|
| `pending` | `PENDING` | Created, not yet sent to provider |
| `processing` | `PROCESSING` | Sent to MTN/Airtel, awaiting customer PIN |
| `successful` | `COMPLETED` | Set `processedAt = now()` |
| `failed` | `FAILED` | Set `failureReason` |
| `cancelled` | `FAILED` (no CANCELLED in Prisma) | Set `failureReason = 'cancelled'` |

> **Note:** Smart Ride's Prisma `PaymentStatus` enum does not have a `CANCELLED` value. NylonPay's `cancelled` should map to `FAILED` with `failureReason = 'Cancelled by customer/system'`. Alternatively, add `CANCELLED` to the Prisma enum (schema migration required) — recommended for cleaner reconciliation.

---

## 8. Supported Countries & Currencies

### 8.1 Countries

| Status | Country | Payment methods |
|---|---|---|
| **Currently available** | **Uganda** | Mobile Money (MTN MoMo, Airtel Money), Cards (Africa-issued, KYC L2), Bank Transfers |
| Coming soon | Kenya | East Africa expansion |
| Coming soon | Tanzania | East Africa expansion |
| Future | Rest of Africa | TBD |

**Uganda is the launch market.** MTN MoMo and Airtel Money are the primary payment methods. This **perfectly matches Smart Ride's target market** (Uganda, Kampala-focused).

### 8.2 Currencies

`USD | EUR | GBP | KES | UGX | TZS | RWF`

**UGX is fully supported.** Smart Ride already defaults to `UGX` everywhere in its DB schema (`Payment.currency @default("UGX")`, `Wallet.currency @default("UGX")`).

### 8.3 Phone number normalization (Uganda-specific)

All phone fields accept any common format and normalize to `256XXXXXXXXX`:

| Input | Stored as |
|---|---|
| `0768499027` | `256768499027` |
| `+256768499027` | `256768499027` |
| `256768499027` | `256768499027` |
| `+256 768 499 027` | `256768499027` |

This matches Smart Ride's existing `MTN_MOMO.formatUgandaPhone()` and `AIRTEL_MONEY.formatUgandaPhone()` patterns — **no reformatting needed** when bridging Smart Ride phone data to NylonPay.

### 8.4 Minimum amounts

| Operation | Minimum |
|---|---|
| Collections | 500 UGX |
| Payouts | 5,000 UGX |

> **Implication:** Smart Ride's wallet top-up minimum must be ≥ 500 UGX. Rider/merchant payout minimum must be ≥ 5,000 UGX. Reject below-minimum amounts client-side before calling the SDK.

---

## 9. Merchant of Record / Settlement / Fees

### 9.1 Is NylonPay the merchant of record?

**Effectively yes, for collections.** Customers pay into your **NylonPay collection account** (created during onboarding under **Accounts → Create Account**). Funds land in your NylonPay balance, net of fees. You then settle out to your bank/wallet via **payouts** or **settlement** (Dashboard → Accounts → settlement phone/bank).

This means:
- NylonPay sits between Smart Ride's customers and Smart Ride's bank account.
- Customer payment → NylonPay collection account (minus 3% collection fee) → Smart Ride-initiated payout to Smart Ride's bank/wallet.
- For rider/merchant payouts: funds move from Smart Ride's NylonPay balance → rider's/merchant's mobile money wallet or bank account.

> This is the typical "aggregator" / "merchant of record" model. NylonPay holds the merchant relationship with MTN/Airtel; Smart Ride does not need its own MTN MoMo API credentials or Airtel client ID/secret. **NylonPay replaces both `MTN_MOMO_*` and `AIRTEL_MONEY_*` env vars with a single set of `NYLONPAY_*` credentials.**

### 9.2 Fee structure (Pricing page)

| KYC Level | Monthly Limit | Bank Transfers | Collections | Payouts & Withdrawals |
|---|---|---|---|---|
| Level 1 | 10M UGX | 3,500 UGX | **3% of amount** | 2,000 UGX (flat) |
| Level 2 | 100M UGX | 3,500 UGX | 3% of amount | 2,500 UGX (flat) |

**Notes:**
- Payout charges are flat regardless of amount.
- Minimum collection: 500 UGX; minimum payout: 5,000 UGX.
- **No monthly fees, no hidden costs.** 3% per collection on mobile money.
- Card payments not yet available; bank transfers active.

### 9.3 Add-on service fees

| Service | Price | Unit |
|---|---|---|
| SMS Notifications | 50 UGX | per SMS |
| Email Receipts | Free | included |
| Auto Invoicing | Free | included |
| EFRIS Tax Resolution | EFRIS rate | varies per item |
| Cross-border Payments | +2% | per transaction |
| Subscription Payments | +0.5% | per transaction |

### 9.4 Fee example (from docs)

For a collection of UGX 100,000:
- Mobile money collection fee (3%): **3,000 UGX**
- You receive: **97,000 UGX** (credited to your NylonPay balance)

### 9.5 What's included in the base fee

- Multi-gateway routing with automatic fallback (MTN ↔ Airtel)
- Real-time transaction dashboard
- Developer SDK for all supported languages
- Standard KYC and compliance
- Email receipts and invoicing

### 9.6 Smart Ride financial model impact

Smart Ride currently charges a 15% commission on most orders (see `Merchant.commissionRate @default(0.15)`). With NylonPay taking 3% off the top of every collection:

- **Effective commission retained by Smart Ride:** ~12% (15% − 3% payment fee) for mobile money collections.
- **Payout cost per disbursement:** 2,000 UGX flat (Level 1 KYC). For a 50,000 UGX rider payout, that's 4% — significant. Consider batching rider payouts (e.g. weekly instead of per-task) to amortize the flat fee.
- **Wallet top-up cost:** The user pays 3% on the collection side; their wallet is credited with 97% of the top-up amount. Smart Ride must decide whether to absorb this fee or pass it to the user.

> **Open question Q2:** Confirm with NylonPay whether the 3% collection fee is deducted from the customer's amount (customer pays 100,000 → 97,000 credited) or charged on top (customer pays 103,000 → 100,000 credited). The docs example reads as the former — customer pays 100K, merchant receives 97K. Confirm before pricing UI is built.

### 9.7 KYC verification (two levels, both free)

| Level | What | Unlock | Limit |
|---|---|---|---|
| **Level 1: Identity Verification** (automatic) | Government ID via hosted ID capture session + selfie + watchlist check + use case eligibility | Live mode | 10M UGX/month |
| **Level 2: Business Document Verification** (manual, up to 5 business days) | Company documents + bank account ownership proof | Card payments + higher limits | 100M UGX/month |

Level 1 is the minimum to go live. Level 2 is required for **card payments** (Africa-issued only) and to raise the monthly limit 10×. Cards require non-virtual, non-prepaid, Africa-issued debit/credit; international cards not yet supported.

---

## 10. Sandbox Testing

### 10.1 Sandbox characteristics

- Same API surface as production.
- Use sandbox API keys (`npk_sandbox_… / nps_sandbox_…`).
- **No real money moves, no fees charged, monthly limits don't apply.**
- Success and failure outcomes are **simulated automatically**.
- Webhooks fire as normal — set up your webhook URL in the dashboard and use ngrok for local dev.
- Sandbox transactions are marked in the dashboard and don't count toward limits/statistics.

### 10.2 Test phone numbers / test cards

> **GAP IN DOCS:** The docs reference a "Testing guide" (linked from sandbox section of Features page and Quick Start) for "how to simulate different outcomes (success, failure, timeout)" and "test phone numbers and expect consistent responses for testing your integration", but **the Testing guide page is not in the sidebar** and is not reachable from the captured URL set. The Features page mentions "Use test phone numbers and expect consistent responses for testing" but doesn't list them.

> **Open question Q3:** Ask NylonPay support for the test phone numbers and test cards. Likely candidates based on industry convention:
> - `+256712345678` (used as the example phone in the webhooks guide)
> - `+256700000000` (used in the collect-payment example)
>
> Confirm whether specific numbers trigger specific outcomes (success/failure/timeout) and whether there's a dashboard toggle to force outcomes.

### 10.3 Switching environments

**Switch by swapping API keys.** There is no `environment: 'sandbox'` config option.

```ts
// Sandbox (development)
const sandboxClient = createNylonPay({
  apiKey: process.env.NYLONPAY_SANDBOX_API_KEY!,
  apiSecret: process.env.NYLONPAY_SANDBOX_API_SECRET!,
});

// Production (live)
const liveClient = createNylonPay({
  apiKey: process.env.NYLONPAY_LIVE_API_KEY!,
  apiSecret: process.env.NYLONPAY_LIVE_API_SECRET!,
});
```

> The docs say to keep sandbox keys active even after going live — use them for testing new features.

---

## 11. Integration Plan for Smart Ride

### 11.1 Recommended environment variables

Add to `.env` (and Vercel project env vars, and EAS secrets if any flow runs mobile-side — it should not, see §11.3):

```bash
# NylonPay — server-side only (NEVER expose to mobile app)
NYLONPAY_API_KEY=npk_sandbox_xxxxxxxxxxxxxxxxxxxxxxxx
NYLONPAY_API_SECRET=nps_sandbox_xxxxxxxxxxxxxxxxxxxxxxxx
NYLONPAY_WEBHOOK_SECRET=whs_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional — for our own logging/metrics. The SDK infers mode from the key prefix,
# but our app may want to label transactions explicitly.
NYLONPAY_MODE=sandbox  # 'sandbox' | 'live'

# Optional — keep legacy MTN/Airtel creds during migration period
MTN_MOMO_SUBSCRIPTION_KEY=...
MTN_MOMO_API_USER=...
MTN_MOMO_API_KEY=...
MTN_MOMO_SECRET_KEY=...
AIRTEL_MONEY_CLIENT_ID=...
AIRTEL_MONEY_CLIENT_SECRET=...
```

**Update `src/lib/config/env.ts`** to register the new category:
```ts
const ENV_CATEGORIES = {
  CRITICAL: ['JWT_SECRET', 'DATABASE_URL'],
  PAYMENT: [
    'NYLONPAY_API_KEY',
    'NYLONPAY_API_SECRET',
    'NYLONPAY_WEBHOOK_SECRET',
    // Legacy — keep during migration
    'MTN_MOMO_SUBSCRIPTION_KEY',
    'MTN_MOMO_API_KEY',
    'MTN_MOMO_SECRET_KEY',
    'AIRTEL_MONEY_CLIENT_ID',
    'AIRTEL_MONEY_CLIENT_SECRET',
  ],
  // ...
};
```

> **Note on env var names requested in the task brief:** The brief suggests `NYLONPAY_SECRET_KEY`, `NYLONPAY_PUBLIC_KEY`, `NYLONPAY_BASE_URL`, `NYLONPAY_WEBHOOK_SECRET`. The actual NylonPay SDK uses `apiKey` + `apiSecret` (not "public"/"secret key" naming), does not expose a configurable base URL, and the webhook secret is a separate value. The recommended env var names above reflect what the SDK actually expects. Map as: `NYLONPAY_API_KEY` ↔ brief's `NYLONPAY_PUBLIC_KEY`, `NYLONPAY_API_SECRET` ↔ brief's `NYLONPAY_SECRET_KEY`, `NYLONPAY_BASE_URL` is not needed.

### 11.2 Install the SDK

```bash
cd /home/z/my-project
bun add @nile-squad/nylonpay-ts
# or: npm install @nile-squad/nylonpay-ts
```

Requires Node.js 18+. Server-side only — **do not** import this package from any code that ships to the mobile app (Expo Router client bundles).

### 11.3 Create the SDK singleton

**New file:** `src/lib/payments/nylonpay.ts`

```ts
/**
 * NylonPay SDK singleton — server-side only.
 *
 * Replaces the per-provider MTN_MOMO and AIRTEL_MONEY integrations with a
 * single unified gateway. NylonPay acts as merchant of record: customer
 * payments land in our NylonPay collection account, and rider/merchant
 * payouts draw from that balance.
 */
import { createNylonPay, type NylonPay } from '@nile-squad/nylonpay-ts';
import { randomBytes } from 'node:crypto';
import { paymentLogger } from '@/lib/logging/logger';

let client: NylonPay | null = null;

export function isNylonPayConfigured(): boolean {
  return Boolean(process.env.NYLONPAY_API_KEY && process.env.NYLONPAY_API_SECRET);
}

export function getNylonPayClient(): NylonPay {
  if (!isNylonPayConfigured()) {
    throw new Error(
      'NylonPay not configured. Set NYLONPAY_API_KEY and NYLONPAY_API_SECRET environment variables.',
    );
  }
  if (!client) {
    client = createNylonPay({
      apiKey: process.env.NYLONPAY_API_KEY!,
      apiSecret: process.env.NYLONPAY_API_SECRET!,
      timeoutMs: 30_000,
      maxRetries: 3,
      maxPollDurationMs: 300_000,
      hooks: {
        beforeCollect: {
          fn: (input) => {
            paymentLogger.info('nylonpay.collect.before', { reference: input.reference });
            return input;
          },
          onError: (err) => paymentLogger.error('nylonpay.collect.before hook failed', { error: String(err) }),
        },
        afterCollect: {
          fn: (result, input) => {
            if (result.isOk) {
              paymentLogger.info('nylonpay.collect.after', { reference: result.value.reference, amount: input.amount });
            } else {
              paymentLogger.error('nylonpay.collect.after failed', { error: result.error, amount: input.amount });
            }
          },
          onError: (err) => paymentLogger.error('nylonpay.collect.after hook failed', { error: String(err) }),
        },
        beforePayout: {
          fn: (input) => {
            paymentLogger.info('nylonpay.payout.before', { reference: input.reference });
            return input;
          },
          onError: (err) => paymentLogger.error('nylonpay.payout.before hook failed', { error: String(err) }),
        },
        afterPayout: {
          fn: (result, input) => {
            if (result.isOk) {
              paymentLogger.info('nylonpay.payout.after', { reference: result.value.reference, amount: input.amount });
            } else {
              paymentLogger.error('nylonpay.payout.after failed', { error: result.error, amount: input.amount });
            }
          },
          onError: (err) => paymentLogger.error('nylonpay.payout.after hook failed', { error: String(err) }),
        },
      },
    });
  }
  return client;
}

/** Generate a 14-char hex reference (fits NylonPay's 13–15 char requirement). */
export function generateNylonPayReference(prefix = 'SR'): string {
  // prefix(2) + 12 hex chars = 14 chars total
  return `${prefix}${randomBytes(6).toString('hex')}`.slice(0, 15);
}

/** Map NylonPay TransactionStatus → Smart Ride PaymentStatus (Prisma). */
export function mapNylonPayStatus(status: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' {
  switch (status) {
    case 'pending':      return 'PENDING';
    case 'processing':   return 'PROCESSING';
    case 'successful':   return 'COMPLETED';
    case 'failed':       return 'FAILED';
    case 'cancelled':    return 'FAILED'; // no CANCELLED in Prisma — log reason
    default:             return 'PROCESSING';
  }
}
```

### 11.4 New API routes

#### `POST /api/payments/nylonpay/initiate` — initiate a collection

Replaces the per-provider logic in `src/app/api/payments/initiate/route.ts` for the NylonPay path. Pattern mirrors the existing MTN/Airtel initiate flow but uses one SDK call.

```ts
// src/app/api/payments/nylonpay/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getNylonPayClient, isNylonPayConfigured, generateNylonPayReference } from '@/lib/payments/nylonpay';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().int().min(500, 'Minimum collection is 500 UGX'),
  currency: z.literal('UGX').default('UGX'),
  description: z.string().min(1).max(200),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10), // any format — NylonPay normalizes
  customerEmail: z.string().email().optional(),
  taskId: z.string().optional(),
  orderId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rate.success) return rateLimitResponse(rate, RATE_LIMITS.payment.initiate);

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyAccessToken(authHeader.split(' ')[1]);
  if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  if (!isNylonPayConfigured()) {
    return NextResponse.json({ success: false, error: 'NylonPay not configured' }, { status: 503 });
  }

  await setRLSContext(decoded);
  try {
    const body = schema.parse(await request.json());

    // Generate reference BEFORE creating the DB row so we can use it as a unique constraint
    const reference = generateNylonPayReference('SR'); // 14 chars, fits 13–15

    // Create Payment row in PENDING state
    const payment = await db.payment.create({
      data: {
        paymentReference: reference,
        userId: decoded.userId,
        amount: body.amount,
        currency: body.currency,
        paymentMethod: 'MTN_MOMO', // see schema note below — NylonPay is the actual provider
        status: 'PENDING',
        phoneNumber: body.customerPhone,
        taskId: body.taskId || null,
        orderId: body.orderId || null,
      },
    });

    const nylonpay = getNylonPayClient();
    const instance = await nylonpay.collectPayment({
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      customer: { name: body.customerName, phoneNumber: body.customerPhone, email: body.customerEmail },
      reference,
      metadata: { paymentId: payment.id, ...(body.metadata ?? {}) },
    });

    // Wire up async event handlers — DO NOT await these
    instance
      .on('processing', () => {
        db.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'PROCESSING' },
        }).catch((e) => console.error('[nylonpay] processing update failed', e));
      })
      .on('success', ({ transaction }) => {
        // Primary path: webhook will handle fulfillment. This is a fallback for SDK-polled success.
        console.log('[nylonpay] success (sdk event)', { reference, operatorTid: transaction?.operatorTid });
      })
      .on('failed', () => {
        // Webhook will be authoritative; this is informational
        console.warn('[nylonpay] failed (sdk event)', { reference });
      })
      .on('error', ({ error, category, retryable }) => {
        console.error('[nylonpay] error (sdk event)', { reference, category, error, retryable });
      });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      reference,
      status: 'PENDING',
      message: 'Payment initiated. Customer will receive a prompt on their phone.',
    });
  } catch (err) {
    console.error('[nylonpay/initiate] error', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Initiation failed' },
      { status: 400 },
    );
  } finally {
    await resetRLSContext();
  }
}
```

> **Schema note:** Smart Ride's `PaymentMethod` Prisma enum has `MTN_MOMO`, `AIRTEL_MONEY`, `VISA`, `MASTERCARD`, `CREDIT_CARD`, `DEBIT_CARD`, `CASH`, `WALLET` — no `NYLONPAY` value. Two options:
> 1. **Add `NYLONPAY` to the Prisma enum** (schema migration required) — cleanest.
> 2. **Reuse `MTN_MOMO` / `AIRTEL_MONEY`** based on the customer's chosen method, with a `metadata.provider = 'nylonpay'` field on the Payment row — minimizes schema churn during migration.
>
> Recommend option 1 once NylonPay becomes the primary gateway.

#### `POST /api/payments/nylonpay/callback` — webhook receiver

Mirrors the existing `/api/payments/mtn-callback/route.ts` pattern. The key differences:
- Signature verification uses `nylonpay.verifyWebhookSignature()` (not MTN's custom HMAC).
- Payload shape: `{ event, data: Transaction, timestamp, signature }`.
- Must capture **raw body** for signature verification.

```ts
// src/app/api/payments/nylonpay/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { getNylonPayClient, isNylonPayConfigured, mapNylonPayStatus } from '@/lib/payments/nylonpay';
import { handleSuccessfulPayment } from '@/lib/payments/payment-service';
import { sendPaymentNotification } from '@/lib/services/notification.service';
import { toNumber } from '@/lib/decimal-utils';

export async function POST(request: NextRequest) {
  // CRITICAL: capture raw body BEFORE any JSON parsing
  const rawBody = await request.text();
  let body: { event: string; data: any; timestamp: string; signature: string };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Metadata-only logging — never dump full body (PII)
  console.log('[nylonpay/callback] received', {
    event: body.event,
    reference: body.data?.reference,
    status: body.data?.status,
    amount: body.data?.amount,
    currency: body.data?.currency,
  });

  if (!isNylonPayConfigured()) {
    return NextResponse.json({ success: false, error: 'NylonPay not configured' }, { status: 500 });
  }

  // Signature + replay verification
  const nylonpay = getNylonPayClient();
  const isValid = nylonpay.verifyWebhookSignature({
    payload: rawBody,
    signature: body.signature,
    secret: process.env.NYLONPAY_WEBHOOK_SECRET!,
    toleranceSeconds: 300, // default 5 min
  });
  if (!isValid) {
    console.error('[nylonpay/callback] signature verification failed', { reference: body.data?.reference });
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  await setServiceRoleContext();
  try {
    const { event, data } = body;

    // Find payment by reference
    const payment = await db.payment.findFirst({
      where: { paymentReference: data.reference },
    });
    if (!payment) {
      console.error('[nylonpay/callback] payment not found', { reference: data.reference });
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    // Idempotency: dedupe on (reference, event)
    // (SDK's verifyWebhookSignature already rejects replays > 5 min old,
    // but we still need to dedupe within the window for at-least-once delivery.)
    const newStatus = mapNylonPayStatus(data.status);

    // Race-condition guard: only update if payment is still non-terminal
    const updateResult = await db.payment.updateMany({
      where: { id: payment.id, status: { in: ['PENDING', 'PROCESSING'] } },
      data: {
        status: newStatus,
        transactionId: data.id,                       // NylonPay transaction id
        providerResponse: JSON.stringify({ event, data }), // store full payload
        processedAt: newStatus === 'COMPLETED' ? new Date() : null,
        failureReason: newStatus === 'FAILED'
          ? (data.failureReason || `${event}: ${data.status}`)
          : null,
      },
    });

    if (updateResult.count === 0) {
      console.warn('[nylonpay/callback] already processed', { paymentId: payment.id, event });
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Re-verify with getStatus() before fulfilling — defense in depth (recommended by docs)
    if (event === 'collection.completed') {
      const verify = await nylonpay.getStatus({ reference: data.reference });
      if (verify.isErr || verify.value.status !== 'successful') {
        console.error('[nylonpay/callback] re-verify mismatch', {
          reference: data.reference,
          webhookStatus: data.status,
          getStatusStatus: verify.isOk ? verify.value.status : verify.error,
        });
        // Don't fulfill — surface to support
        return NextResponse.json({ success: false, error: 'Status mismatch' }, { status: 400 });
      }

      try {
        await handleSuccessfulPayment(payment.id);
      } catch (financeError) {
        console.error('[nylonpay/callback] handleSuccessfulPayment failed', financeError);
        // Don't fail the webhook — payment status is already updated
      }
    }

    // Send user notification
    await sendPaymentNotification(
      payment.userId,
      payment.id,
      toNumber(payment.amount),
      newStatus === 'COMPLETED' ? 'COMPLETED' : newStatus === 'FAILED' ? 'FAILED' : 'REFUNDED',
    );

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PAYMENT_CALLBACK_PROCESSED',
          entityType: 'Payment',
          entityId: payment.id,
          taskId: payment.taskId,
          description: `NylonPay webhook: ${event} → ${newStatus}`,
          newValues: JSON.stringify({ event, status: newStatus, transactionId: data.id, operatorTid: data.operatorTid }),
        },
      });
    } catch (auditError) {
      console.error('[nylonpay/callback] audit log failed', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[nylonpay/callback] error', error);
    return NextResponse.json({ success: false, error: 'Callback failed' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
```

> **Critical Next.js note:** By default, Next.js App Router parses the request body as JSON before your handler runs, which **breaks signature verification** (you need the raw bytes). Two solutions:
> 1. Use `request.text()` as shown above (works in App Router route handlers — the body is a `ReadableStream` until you consume it).
> 2. Add `export const runtime = 'nodejs'` (not edge) at the top of the route file — edge runtime has different body-handling semantics.
>
> Do NOT use `express.json({ verify: ... })` middleware — that's the Express example in the docs, not Next.js.

### 11.5 Wallet top-up via NylonPay

Replace the MTN/Airtel branches in `src/app/api/wallet/topup/route.ts` (which currently creates a PENDING `WalletTransaction` and waits for the provider callback) with a NylonPay collection. The webhook (`/api/payments/nylonpay/callback`) credits the wallet when `collection.completed` arrives.

The existing top-up route already follows the correct pattern (don't credit balance, wait for webhook). Wire the initiate call to NylonPay:

```ts
// In src/app/api/wallet/topup/route.ts — replace MTN/Airtel branches:
const nylonpay = getNylonPayClient();
const reference = generateNylonPayReference('WT'); // WT = wallet top-up, 14 chars
const instance = await nylonpay.collectPayment({
  amount: validated.amount,
  currency: 'UGX',
  description: `Wallet top-up — Smart Ride`,
  customer: {
    name: decoded.name || 'Smart Ride User',
    phoneNumber: validated.phoneNumber,
  },
  reference,
  metadata: { walletId, userId: decoded.userId, purpose: 'wallet_topup' },
});
// Create PENDING WalletTransaction with externalReference=reference
// Balance credits on webhook (collection.completed) — see callback handler
```

The callback handler needs a branch for wallet top-ups: check `metadata.purpose === 'wallet_topup'` and credit the wallet via the existing wallet service.

### 11.6 Rider / merchant payouts via NylonPay

Replace `processRiderPayout()` in `src/lib/payments/index.ts` (which currently calls `mtnMomoService.disburseFunds` / `airtelMoneyService.disburseFunds`) with a NylonPay `makePayout` call.

```ts
// In src/lib/payments/index.ts — replace processRiderPayout:
export async function processRiderPayout(params: {
  riderId: string;
  amount: number;       // must be ≥ 5,000 UGX
  phoneNumber: string;  // rider's MTN/Airtel wallet
  riderName: string;
  description?: string;
}): Promise<PaymentResult> {
  if (params.amount < 5000) {
    return { success: false, error: 'Minimum payout is 5,000 UGX' };
  }
  if (!isNylonPayConfigured()) {
    return { success: false, error: 'NylonPay not configured' };
  }

  const nylonpay = getNylonPayClient();
  const reference = generateNylonPayReference('PO'); // PO = payout, 14 chars
  const instance = await nylonpay.makePayout({
    amount: params.amount,
    currency: 'UGX',
    description: params.description || `Rider payout — ${params.riderId}`,
    customer: { name: params.riderName, phoneNumber: params.phoneNumber },
    destination: {
      accountHolderName: params.riderName,
      accountNumber: params.phoneNumber, // mobile money wallet
    },
    reference,
    metadata: { riderId: params.riderId, purpose: 'rider_payout' },
  });

  // Track via events; webhook will be authoritative for settlement
  // Create a Payout / WalletTransaction row in PENDING state
  // Mark COMPLETED on payout.completed webhook

  return { success: true, referenceId: reference };
}
```

**Merchant payouts** follow the same pattern — destination can be either a mobile money wallet (`destination.accountNumber = phone`, omit `bankName`) or a bank account (`destination.accountNumber = bankAccountNumber`, include `bankName`). The existing `Merchant` model already has `bankAccountName`, `bankAccountNumber`, `bankName` fields — these map directly to NylonPay's `Destination` type.

### 11.7 Wiring into the existing payment state machine

Smart Ride's `src/lib/payments/payment-state-machine.ts` enforces:
```
PENDING → PROCESSING | FAILED
PROCESSING → COMPLETED | FAILED
COMPLETED → REFUNDED
```

This is **already compatible** with NylonPay's lifecycle:
- `pending → processing` (NylonPay) maps to `PENDING → PROCESSING` (Prisma) — fire from the SDK's `'processing'` event or the webhook's `collection.completed` (after re-verify).
- `processing → successful` (NylonPay) maps to `PROCESSING → COMPLETED` (Prisma) — fire from the webhook's `collection.completed` after `getStatus()` re-verify.
- `processing → failed` (NylonPay) maps to `PROCESSING → FAILED` (Prisma) — fire from the webhook's `collection.failed`.
- `processing → cancelled` (NylonPay) maps to `PROCESSING → FAILED` (Prisma, no CANCELLED) — fire from the webhook's `collection.failed` or a custom event.

> **Recommendation:** Add `CANCELLED` to the Prisma `PaymentStatus` enum so cancelled payments don't pollute `FAILED` metrics. Migration required.

Use the existing `transitionPaymentStatus()` function for all status changes — don't write directly to `db.payment.update`. This preserves the audit trail and race-condition guards.

### 11.8 Hosted payment links (invoices) for cash-on-delivery fallback

For scenarios where the customer can't be reached by STK push (e.g. weak network, customer not on the phone), use `createInvoice()` to generate a hosted payment link and send it via SMS:

```ts
const result = await nylonpay.createInvoice({
  amount: 50_000,
  currency: 'UGX',
  description: 'Smart Ride — Order #12345',
  reference: generateNylonPayReference('IN'),
  redirectUrl: 'https://smartrideug.vercel.app/orders/12345/receipt',
  items: [{ name: 'Boda ride — Kampala', quantity: 1, unitPrice: 50_000 }],
  metadata: { orderId: '12345', taskType: 'SMART_BODA_RIDE' },
});
if (result.isOk) {
  // SMS the URL to the customer (50 UGX/SMS addon, or our own Africa's Talking integration)
  await sendSms(customerPhone, `Pay your Smart Ride order: ${result.value.url}`);
}
```

### 11.9 Migration strategy — phased rollout

**Phase 1 (Sandbox):** Install SDK, create `src/lib/payments/nylonpay.ts` singleton, create `/api/payments/nylonpay/initiate` + `/api/payments/nylonpay/callback` routes. Wire up sandbox keys. Test full flow against sandbox (collections + payouts + webhooks via ngrok).

**Phase 2 (Live KYC):** Submit Level 1 KYC (1–2 business days). While waiting, complete the migration of `initiatePayment()` in `src/lib/payments/payment-service.ts` and `src/lib/payments/index.ts` to delegate to NylonPay for the `MTN_MOMO` and `AIRTEL_MONEY` branches (keep the legacy `mtn-momo.ts` and `airtel-money.ts` files as fallback during the migration window).

**Phase 3 (Live rollout):** Swap sandbox keys for live keys. Remove legacy MTN/Airtel env vars. Delete `src/lib/payments/mtn-momo.ts` and `src/lib/payments/airtel-money.ts` and their callback routes (`/api/payments/mtn-callback`, `/api/payments/airtel-callback`, and the duplicate `/api/payments/mtn/callback` and `/api/payments/airtel/callback` aliases).

**Phase 4 (Optional):** Submit Level 2 KYC to enable card payments (Africa-issued Visa only). Update `processCardPayment()` in `src/lib/payments/index.ts` to use NylonPay instead of the current `TODO: Integrate with Flutterwave or Paystack` stub.

### 11.10 What gets **deleted** after migration

- `src/lib/payments/mtn-momo.ts` (replaced by NylonPay SDK)
- `src/lib/payments/airtel-money.ts` (replaced by NylonPay SDK)
- `src/app/api/payments/mtn-callback/route.ts`
- `src/app/api/payments/mtn/callback/route.ts` (alias)
- `src/app/api/payments/airtel-callback/route.ts`
- `src/app/api/payments/airtel/callback/route.ts` (alias)
- `src/lib/payments/flutterwave-service.ts` (replaced by NylonPay card support at KYC L2)
- Env vars: `MTN_MOMO_*`, `AIRTEL_MONEY_*`, `FLUTTERWAVE_*`

### 11.11 What stays

- `src/lib/payments/payment-service.ts` — orchestrator, just swaps its internal calls.
- `src/lib/payments/payment-state-machine.ts` — unchanged (validates transitions).
- `src/lib/payments/refund-service.ts` — will need to call NylonPay refund API once docs surface it (currently not in captured pages).
- `src/lib/payments/index.ts` — orchestrator, swaps internals.
- `src/lib/security/webhook-protection.ts` — reuse for NylonPay idempotency layer (add `'NYLONPAY'` to the `provider` union).
- `src/lib/finance/*` — commission engine, settlement service, transaction ledger — all unchanged.

### 11.12 Estimated integration effort

| Step | Effort |
|---|---|
| Install SDK + create singleton | 0.5 hour |
| `/api/payments/nylonpay/initiate` route | 2 hours |
| `/api/payments/nylonpay/callback` route (with raw-body handling, signature verify, re-verify with getStatus, idempotency) | 3 hours |
| Wire `initiatePayment()` to delegate to NylonPay | 1 hour |
| Wire `processRiderPayout()` to NylonPay | 1 hour |
| Wallet top-up + wallet credit on webhook | 2 hours |
| Sandbox end-to-end testing (collections + payouts + webhooks via ngrok) | 4 hours |
| Update env validation + Vercel env vars + EAS secrets | 0.5 hour |
| KYC L1 submission + waiting | 1–2 business days (external) |
| Live cutover + smoke tests | 2 hours |
| Cleanup legacy MTN/Airtel code | 1 hour |
| **Total dev effort** | **~17 hours** (excluding KYC waiting) |

---

## 12. Open Questions for NylonPay Support

> Email: `nylonpay@mail.nilesquad.com` (from Features page → Support section).
> Dashboard support widget also available.

### Q1 — SDK base URL / self-hosting
Does the SDK hardcode the backend base URL, or does it fetch it at runtime? Can we point the SDK at a self-hosted/on-prem NylonPay instance? (Not blocking — we're using the hosted version.)

### Q2 — Fee deduction model
Confirm whether the 3% collection fee is **deducted from the customer's amount** (customer pays 100,000 → 97,000 credited to merchant balance) or **charged on top** (customer pays 103,000 → 100,000 credited). The Pricing page example reads as the former — please confirm. Affects Smart Ride's checkout UI (do we show the fee to the customer?).

### Q3 — Test phone numbers / test cards
The docs reference a "Testing guide" with test phone numbers and instructions for simulating success/failure/timeout, but the page is not in the sidebar. Please share:
- Test phone numbers for MTN MoMo sandbox (e.g. `+256712345678`?)
- Test phone numbers for Airtel Money sandbox
- Test card numbers (when card support launches)
- How to trigger each outcome (success / failure / timeout / cancellation) in sandbox
- Is there a dashboard toggle to force outcomes per transaction?

### Q4 — Webhook retry timing for "stuck" payouts
If a `payout.completed` webhook is consistently failing (5 retries exhausted), is there a way to manually re-fire it from the dashboard beyond the documented "retry from the dashboard" button? What's the maximum retry window? Can we get a dead-letter queue?

### Q5 — Refund API surface
The Concepts page lists `refund` as a transaction type ("merchant-initiated return of funds to a customer, full or partial"), and the webhook events include `refund.completed`. But there is **no `refundPayment()` method documented** in the SDK Reference. How do we initiate a refund? Is it a dashboard-only action, or is there an SDK method (e.g. `nylonpay.refund({ reference, amount })`) that's just not documented yet?

### Q6 — Settlement timing
After a successful collection, how long until funds are available in our NylonPay balance for payout? Immediate? T+0? T+1? Affects when we can disburse rider payouts after a customer pays.

### Q7 — IP whitelist for webhooks
The Security page mentions we can "whitelist Nylon Pay's IP addresses" for inbound webhook verification. What are the current IP ranges? (Useful for an additional firewall layer on our callback endpoint beyond signature verification.)

### Q8 — Multiple collection accounts
The onboarding flow mentions creating multiple collection accounts (e.g. "My Business Account"). Can we use multiple collection accounts to segregate funds by service line (Ride / Food / Shopping / Health) within a single NylonPay merchant account? Or do we need separate merchant accounts per service line?

### Q9 — Rate limits
What are the per-key rate limits (requests per minute / per day) for `collectPayment`, `makePayout`, `getStatus`, `createInvoice`? The dashboard supports configuring them per key, but what are the defaults?

### Q10 — Cross-border payments
The Pricing page lists "Cross-border Payments +2% per transaction". When does this surcharge apply? For collections from non-UGX wallets? For payouts to non-Ugandan numbers? For transactions in USD/EUR/GBP? Smart Ride is Uganda-only for now, but we want to know if there are hidden fees if a customer tries to pay from a Kenyan M-Pesa number.

### Q11 — Webhook secret rotation
The Webhooks guide says "Rotate the webhook secret periodically from the dashboard." Does rotation cause a brief window of failed signature verifications? Is there a grace period where both old and new secrets are accepted? How should we handle zero-downtime rotation on our end?

### Q12 — `transfer` and `escrow` transaction types
The `TransactionType` union includes `transfer` and `escrow`, but the Concepts → Transaction Types page only documents `collection`, `payout`, `refund`, `reversal`, `charge`, `chargeback`. Are `transfer` and `escrow` exposed via SDK methods? Could `escrow` be used for Smart Ride's "hold payment until delivery confirmed" flow (we currently model this with task state machines)? This would be a major feature win if available.

### Q13 — Invoice expiry
The `InvoiceResponse` includes `expiresAt`. What's the default TTL for an invoice? Can we configure it? What happens to the webhook if a customer pays an expired invoice?

### Q14 — Idempotency key character set
The reference must be 13–15 characters. What character set is allowed? Alphanumeric only? Are dashes/underscores allowed (e.g. `SR-ORDER-12345`)? The examples use hex (`randomBytes(7).toString('hex')` = 14 chars) and the example `ORD-2026-00001` (14 chars including dashes) — please confirm special characters are OK.

---

## Appendix A — Full page inventory captured

All 24 sidebar pages were captured via agent-browser on 2026-06-18. Raw `document.body.innerText` text was saved to `/tmp/nylonpay-docs/*.txt` during research (not persisted to repo). Below is the sidebar tree with real URLs:

```
Getting Started
├── Welcome to Nylon Pay            → /docs
├── Features                        → /docs/features
├── Quick Start                     → /docs/quickstart
└── Your First Payment              → /docs/quickstart/first-payment

SDK
├── SDK Overview                    → /docs/sdk
├── Configuration                   → /docs/sdk/configuration
├── Collect Payment                 → /docs/sdk/collect-payment
├── Make Payout                     → /docs/sdk/make-payout
├── Payment Events                  → /docs/sdk/payment-events
├── Get Status                      → /docs/sdk/get-status
├── Invoices                        → /docs/sdk/invoices
├── Hooks                           → /docs/sdk/hooks
└── Error Handling                  → /docs/sdk/error-handling

Concepts
├── Transaction Types               → /docs/concepts/transaction-types
├── Transaction Lifecycle           → /docs/concepts/transaction-lifecycle
└── Security                        → /docs/concepts/security

Guides
├── Merchant Onboarding             → /docs/guides/merchant-onboarding
├── Webhooks                        → /docs/guides/webhooks
├── Payment Links                   → /docs/guides/payment-links
└── Pricing                         → /docs/guides/pricing

Coverage
├── Supported Countries             → /docs/coverage/supported-countries
├── Supported Languages             → /docs/coverage/supported-languages
└── Requirements                    → /docs/coverage/requirements

Reference
├── API Reference                   → /docs/api-reference
└── Types                           → /docs/api-reference/types
```

## Appendix B — SDK error categories (`SdkErrorCategory`)

Branch on `category`, never on HTTP status or message text.

| Category | Retryable | Meaning |
|---|---|---|
| `auth` | No | Invalid or missing key, bad signature, scope |
| `validation` | No | Input the server rejected |
| `limit` | No | Account or KYC transaction limits exceeded |
| `rate_limit` | Yes | Too many requests |
| `account` | No | Merchant account missing or not active |
| `provider` | Yes | Payment provider rejected the operation |
| `not_found` | No | Referenced transaction does not exist |
| `internal` | Yes | Unexpected server error |
| `network` | Yes | Request never reached the server |
| `timeout` | Yes | Request exceeded the configured timeout |

Use `parseError(errorString)` from the SDK to decode a `Result.Err` into a structured `SdkError = { code, message, statusCode?, retryable? }`. Unrecognized errors default to `internal`.

## Appendix C — Common HTTP error codes (from API Reference page)

| Code | Meaning |
|---|---|
| `HTTP_4XX` | Client error (bad request, unauthorized) |
| `HTTP_5XX` | Server error |
| `TIMEOUT` | Request timed out |
| `NETWORK_ERROR` | Connection failed |
| `INVALID_RESPONSE` | Unexpected response format |
| `RESPONSE_TAMPERED` | Response signature mismatch |
| `UNKNOWN` | Unexpected error |

---

**End of NP-1 research document.** Next agent (NP-2) can use this to implement the integration following the plan in §11. No project code was modified by this task.
