/**
 * Country-aware pricing for the /order page.
 *
 * India gets its own price point and gateway (Razorpay, INR) rather than a
 * currency-converted AED 99 — that's a real product decision, not a fallback,
 * so it's kept as an explicit named entry rather than derived from a
 * conversion rate that would drift.
 *
 * Every other country falls back to the AED plan, paying by card (Stripe) or
 * Razorpay — which stays available outside India since it settles
 * internationally, not just in INR. A defined set of Middle East countries
 * also get Abzer Pay (AED, hosted-redirect) — see lib/abzer.ts.
 *
 * Tabby and Tamara were offered here and are not any more: instalments read
 * oddly against AED 99, and neither ever had a checkout URL configured, so
 * picking one could not take a payment. Their ids survive below so the option
 * can be restored without unpicking the type.
 */

export type PaymentMethodId = "razorpay" | "stripe" | "tabby" | "tamara" | "abzer";

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
  originalLabel: "₹10,000",
  originalAmount: 10000,
  methods: ["razorpay", "stripe"],
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
  // The same ₹10,000 reference price as the India plan, converted at roughly
  // ₹22.7 to the dirham (₹10,000 ≈ AED 440.5) and rounded down to a clean
  // figure. Adjust both this and originalAmount together if the rate moves.
  originalLabel: "AED 440",
  originalAmount: 440,
  // Tabby and Tamara are deliberately absent: instalments read oddly
  // against AED 99, and neither had a checkout URL configured, so
  // choosing one could not take a payment — it fell through to the
  // "team will follow up" path while the copy promised instalments.
  // The ids and links stay in place so they can be switched back on.
  methods: ["razorpay", "stripe"],
};

const DEFAULT = DEFAULT_PLAN;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  razorpay: "Razorpay",
  stripe: "Card (Stripe)",
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
    // Razorpay leads, Abzer behind it. Both complete a payment now that
    // checkout charges this plan's own currency rather than only INR.
    const [first, ...rest] = DEFAULT.methods;
    return { ...DEFAULT, methods: [first!, "abzer", ...rest] };
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

/** Friendly aliases accepted in the `?country=` link on /order, so a campaign
 *  can share `/order?country=uae` or `/order?country=india` rather than the
 *  bare ISO code. Maps to the codes in COUNTRY_OPTIONS. */
const COUNTRY_PARAM_ALIASES: Record<string, string> = {
  in: "IN", india: "IN",
  ae: "AE", uae: "AE", "united-arab-emirates": "AE", emirates: "AE",
  sa: "SA", ksa: "SA", saudi: "SA", "saudi-arabia": "SA",
  om: "OM", oman: "OM",
  kw: "KW", kuwait: "KW",
  qa: "QA", qatar: "QA",
  bh: "BH", bahrain: "BH",
  other: "OTHER",
};

/** Resolves a `?country=` query value to a known country code, accepting either
 *  an ISO code (IN, ae) or a friendly alias (india, uae, …). Returns "" for
 *  anything unrecognised, so the caller falls back to geo-detection instead of
 *  forcing a wrong plan. */
export function countryFromParam(raw: string | undefined | null): string {
  if (!raw) return "";
  const key = raw.trim().toLowerCase();
  if (COUNTRY_PARAM_ALIASES[key]) return COUNTRY_PARAM_ALIASES[key];
  const upper = raw.trim().toUpperCase();
  return COUNTRY_OPTIONS.some((c) => c.code === upper) ? upper : "";
}
