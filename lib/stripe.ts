import Stripe from "stripe";

/**
 * Server-only Stripe client.
 *
 * Charges the currency of the buyer's own plan — rupees for India, dirhams
 * elsewhere — rather than converting to a single settlement currency, so the
 * price quoted on the page is the price on the statement.
 *
 * Whether a given currency is actually accepted depends on the Stripe
 * account: an account registered in India can only charge INR from Indian
 * customers without export documentation, and cross-border rules vary. If
 * checkout is refused for one country and works for another, that is an
 * account setting, not this file.
 */

let client: Stripe | null = null;

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured — set STRIPE_SECRET_KEY.");
    this.name = "StripeNotConfiguredError";
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();

  // Re-validated on every call, matching lib/razorpay.ts: if the variable is
  // ever unset after a successful init, callers get the clear error rather
  // than a stale client quietly carrying on.
  if (!client) client = new Stripe(key);
  return client;
}

/** Verifies a webhook came from Stripe. Signed over the raw body, so the
 *  route must pass the unparsed text — a re-serialized object will not match. */
export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
}
