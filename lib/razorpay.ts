import Razorpay from "razorpay";

/**
 * Server-only Razorpay client. Real checkout is scoped to the India plan
 * (see app/api/razorpay/create-order/route.ts) — the account behind
 * RAZORPAY_KEY_ID/SECRET is assumed to settle in RAZORPAY_CURRENCY only, so
 * nothing here ever charges a different currency.
 */

let client: Razorpay | null = null;

export class RazorpayNotConfiguredError extends Error {
  constructor() {
    super("Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    this.name = "RazorpayNotConfiguredError";
  }
}

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new RazorpayNotConfiguredError();

  // Cached, but re-validated above every call — if the env vars are ever
  // unset after the first successful init, callers still get the clear
  // "not configured" error instead of a stale client silently continuing.
  if (!client) client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

export function razorpayCurrency(): string {
  return process.env.RAZORPAY_CURRENCY || "INR";
}
