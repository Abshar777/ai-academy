import type { PaymentMethodId } from "./pricing";

/**
 * Real payment redirects, not simulated ones — each of these is a URL to an
 * actual hosted checkout (a Razorpay Payment Link, a Tabby/Tamara checkout
 * session) that the account owner creates from their own dashboard. There is
 * no merchant account behind this codebase, so until these env vars are set,
 * "Buy now" cannot charge anyone — it falls back to the enquiry form instead
 * of linking to a dead or fake destination.
 */
const LINKS: Record<PaymentMethodId, string | undefined> = {
  razorpay: process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK,
  tabby: process.env.NEXT_PUBLIC_TABBY_CHECKOUT_URL,
  tamara: process.env.NEXT_PUBLIC_TAMARA_CHECKOUT_URL,
  // Abzer has its own dedicated create-order route (see
  // app/api/abzer/create-order) and never falls through to this static-link
  // path — kept here only so this Record stays exhaustive over
  // PaymentMethodId.
  abzer: undefined,
};

export function paymentLinkFor(method: PaymentMethodId): string | null {
  return LINKS[method] ?? null;
}
