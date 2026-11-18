import type { PricingPlan } from "./pricing";

/**
 * The vocabulary of a custom-price link, with no database behind it, so the
 * client components can read it without pulling the MongoDB driver into the
 * browser bundle — the same split as lib/watch-states.ts and
 * lib/email-kinds.ts.
 */

/** The two currencies the gateways actually settle. */
export const OFFER_CURRENCIES = ["INR", "AED"] as const;
export type OfferCurrency = (typeof OFFER_CURRENCIES)[number];

/** The cookie that carries a code from the link to every other page. It holds
 *  the code and nothing else: the price is resolved from the database each
 *  time, so editing this by hand changes which offer you are asking for, never
 *  what it costs. */
export const OFFER_COOKIE = "offer";

/** What /api/offer/validate hands back — enough to render a price, and no
 *  more. */
export type ResolvedOffer = {
  code: string;
  amount: number;
  currency: OfferCurrency;
  originalAmount?: number;
};

/** "₹2,999", "AED 99" — matching the labels lib/pricing.ts writes by hand for
 *  the standard plans, so an offer price sits in the same sentence as a plan
 *  price without looking foreign. */
export function formatOfferAmount(amount: number, currency: OfferCurrency): string {
  const figure = Number.isInteger(amount)
    ? amount.toLocaleString("en-IN")
    : amount.toFixed(2);
  return currency === "INR" ? `₹${figure}` : `AED ${figure}`;
}

/**
 * Dresses an offer up as a pricing plan, so every component that already
 * renders a plan renders this instead without knowing offers exist.
 *
 * Razorpay only, deliberately. It settles both rupees and dirhams and is the
 * lead method on every standard plan, whereas Abzer is dirhams-and-the-Gulf
 * only — so an INR offer opened in Dubai would have no gateway that could
 * take it. One method here means a custom link behaves the same everywhere,
 * which is the entire point of it.
 */
export function offerToPlan(offer: ResolvedOffer): PricingPlan {
  return {
    country: "OFFER",
    amount: offer.amount,
    currency: offer.currency,
    label: formatOfferAmount(offer.amount, offer.currency),
    originalLabel:
      offer.originalAmount !== undefined
        ? formatOfferAmount(offer.originalAmount, offer.currency)
        : undefined,
    originalAmount: offer.originalAmount,
    methods: ["razorpay"],
  };
}
