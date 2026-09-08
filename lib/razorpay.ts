import Razorpay from "razorpay";

/**
 * Server-only Razorpay client.
 *
 * Checkout charges the currency of the buyer's plan — see
 * app/api/razorpay/create-order/route.ts, which resolves it from the country.
 * Anything other than INR needs International Payments enabled on the
 * Razorpay account; without it the order call is refused and checkout will
 * not open, so confirm that in the dashboard before relying on it in
 * production.
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

/**
 * No longer decides what checkout charges — the plan does. Kept because
 * RAZORPAY_CURRENCY is still set in deployed environments, and a function that
 * quietly disappeared would be harder to trace than one that says so.
 */
export function razorpayCurrency(): string {
  return process.env.RAZORPAY_CURRENCY || "INR";
}
