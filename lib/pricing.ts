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
 * settles internationally, not just in INR.
 */

export type PaymentMethodId = "razorpay" | "tabby" | "tamara";

export type PricingPlan = {
  country: string;
  amount: number;
  currency: string;
  /** For display — e.g. "AED 99", "₹1,000". */
  label: string;
  methods: PaymentMethodId[];
};

/** Exported directly (not just through planForCountry) so the Razorpay API
 *  routes can charge this fixed amount server-side without trusting
 *  anything the client sends — see app/api/razorpay/create-order/route.ts. */
export const INDIA_PLAN: PricingPlan = {
  country: "IN",
  amount: 999,
  currency: "INR",
  label: "₹999",
  methods: ["razorpay"],
};

const INDIA = INDIA_PLAN;

const DEFAULT: PricingPlan = {
  country: "AE",
  amount: 99,
  currency: "AED",
  label: "AED 99",
  methods: ["tabby", "tamara", "razorpay"],
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  razorpay: "Razorpay",
  tabby: "Tabby",
  tamara: "Tamara",
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

/** Falls back to AE for anything not in the picker (unset cookie, a stray
 *  value, etc.) rather than rendering a blank/invalid select option. */
export function normalizeCountry(code: string): string {
  const known = COUNTRY_OPTIONS.some((c) => c.code === code);
  return known ? code : "AE";
}
