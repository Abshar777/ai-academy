/**
 * Country-aware pricing for the /order page.
 *
 * India gets its own price point and gateway (Razorpay, INR) rather than a
 * currency-converted AED 99 — that's a real product decision, not a fallback,
 * so it's kept as an explicit named entry rather than derived from a
 * conversion rate that would drift.
 *
 * Every other country falls back to the AED plan with Tabby, Tamara and
 * Razorpay all offered — Razorpay stays available outside India too since it
 * settles internationally, not just in INR. A defined set of Middle East
 * countries also get Abzer Pay (AED, hosted-redirect) — see lib/abzer.ts —
 * the only one of these four that's actually wired to a real gateway for
 * non-India countries; Tabby/Tamara/Razorpay there still just route to a
 * static payment link or a "team will follow up" fallback.
 */

export type PaymentMethodId = "razorpay" | "tabby" | "tamara" | "abzer";

/** Countries where Abzer Pay is offered, per product decision — not every
 *  non-India country, just this named Middle East set. "OTHER" deliberately
 *  stays off this list. Exported so the create-order API route can re-check
 *  this server-side rather than trusting a country the client sends. */
const ABZER_COUNTRIES = new Set(["AE", "SA", "OM", "KW", "QA", "BH"]);

export function isAbzerCountry(countryCode: string | undefined | null): boolean {
  return Boolean(countryCode && ABZER_COUNTRIES.has(countryCode));
}

export type PricingPlan = {
  country: string;
  amount: number;
  currency: string;
  /** For display — e.g. "AED 99", "₹1,000". */
  label: string;
  /** Struck-through reference price shown next to `label` as a launch-offer
   *  anchor — display only, never charged or trusted server-side. Optional:
   *  not every plan has one. */
  originalLabel?: string;
  /** The same figure as a number, so the discount badge can be derived
   *  instead of hardcoded (and can't drift from the prices it describes). */
  originalAmount?: number;
  methods: PaymentMethodId[];
};

/** Whole-percent saving off the reference price, or null when a plan has no
 *  reference price to discount from. */
export function discountPercent(plan: PricingPlan): number | null {
  if (!plan.originalAmount || plan.originalAmount <= plan.amount) return null;
  return Math.round((1 - plan.amount / plan.originalAmount) * 100);
}

/** Exported directly (not just through planForCountry) so the Razorpay API
 *  routes can charge this fixed amount server-side without trusting
 *  anything the client sends — see app/api/razorpay/create-order/route.ts. */
export const INDIA_PLAN: PricingPlan = {
  country: "IN",
  amount: 999,
  currency: "INR",
  label: "₹999",
  originalLabel: "₹4,000",
  originalAmount: 4000,
  methods: ["razorpay"],
};

const INDIA = INDIA_PLAN;

/** Exported (as DEFAULT_PLAN) so the Abzer API route can charge this fixed
 *  amount server-side without trusting anything the client sends — see
 *  app/api/abzer/create-order/route.ts. */
export const DEFAULT_PLAN: PricingPlan = {
  country: "AE",
  amount: 99,
  currency: "AED",
  label: "AED 99",
  // The same ₹4,000 reference price as the India plan, converted at roughly
  // ₹22.7 to the dirham and rounded down to a clean figure. Adjust both this
  // and originalAmount together if the rate moves.
  originalLabel: "AED 175",
  originalAmount: 175,
  methods: ["tabby", "tamara", "razorpay"],
};

const DEFAULT = DEFAULT_PLAN;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  razorpay: "Razorpay",
  tabby: "Tabby",
  tamara: "Tamara",
  abzer: "Abzer Pay",
};

/** A short list of countries worth naming in the picker — not exhaustive;
 *  "Other" always falls back to the AED plan. */
export const COUNTRY_OPTIONS: { code: string; name: string }[] = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IN", name: "India" },
  { code: "OM", name: "Oman" },
  { code: "KW", name: "Kuwait" },
  { code: "QA", name: "Qatar" },
  { code: "BH", name: "Bahrain" },
  { code: "OTHER", name: "Other" },
];

export function planForCountry(countryCode: string | undefined | null): PricingPlan {
  if (countryCode === "IN") return INDIA;
  if (countryCode && ABZER_COUNTRIES.has(countryCode)) {
    // Abzer first — it's the only method here that actually completes a
    // payment; Tabby/Tamara/Razorpay stay listed but fall through to the
    // static-link/"team will follow up" path, same as today.
    return { ...DEFAULT, methods: ["abzer", ...DEFAULT.methods] };
  }
  return DEFAULT;
}

/** ISO country code -> WhatsApp/E.164 dial code, for the countries in
 *  COUNTRY_OPTIONS. Lets lib/whatsapp.ts turn a locally-formatted number
 *  (e.g. "0501234567") into E.164 using the country the customer actually
 *  picked, instead of guessing from the digits alone — which is ambiguous
 *  between, say, UAE and Saudi Arabia (both "05X-XXXXXXX"). No entry for
 *  "OTHER" since there's nothing to default to. */
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  AE: "+971",
  SA: "+966",
  IN: "+91",
  OM: "+968",
  KW: "+965",
  QA: "+974",
  BH: "+973",
};

/** Falls back to India for anything not in the picker rather than rendering
 *  a blank/invalid select option. That covers the case where geo detection
 *  gave us nothing — an unset/empty `country` cookie, which is what happens
 *  in local dev and whenever the edge network can't place the request (see
 *  middleware.ts) — so an unplaced visitor is quoted INR.
 *
 *  Note this is only the *default* selection: explicitly picking "Other" in
 *  the country picker still resolves to the AED plan via planForCountry. */
export function normalizeCountry(code: string): string {
  const known = COUNTRY_OPTIONS.some((c) => c.code === code);
  return known ? code : "IN";
}
