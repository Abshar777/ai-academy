import { getDb } from "./mongodb";
import { COLLECTION, LIVE, type Enrollment, type EnrollmentSource } from "./enrollments";

/**
 * Revenue, counted by the currency each enrolment was actually charged in.
 *
 * This exists because the overview used to read revenue by *source*:
 * "razorpay" summed as INR and "abzer" summed as AED. Both were wrong.
 * `lib/razorpay.ts` takes its currency from `RAZORPAY_CURRENCY` and
 * `lib/pricing.ts` charges "this plan's own currency rather than only INR",
 * so Razorpay bills AED for the Gulf plans — nine such rows were being
 * added into the rupee total as though AED 891 were ₹891. Meanwhile the AED
 * figure counted Abzer alone, so AED taken through Razorpay and by hand
 * (bank transfer, cash) was invisible: AED 297 shown against AED 1,386 real.
 *
 * The lesson is in the grouping: a row's `currency` field is the only thing
 * that says what it was charged in. Source says how the money arrived, which
 * is a different question and is reported separately below. Nothing here
 * converts between currencies or adds them together — there is no honest
 * single total across two currencies, and inventing an exchange rate to
 * print one would be a figure nobody could reconcile against a gateway.
 */

/** Month buckets follow Indian dates — the academy's books close on them. */
const MONTH_ZONE = "Asia/Kolkata";

export type RevenueTotal = { currency: string; minorUnits: number; count: number };
export type RevenueBySource = {
  currency: string;
  source: EnrollmentSource;
  minorUnits: number;
  count: number;
};
export type RevenueMonth = { month: string; currency: string; minorUnits: number; count: number };

export type RevenueReport = {
  /** One row per currency, highest-earning first. */
  totals: RevenueTotal[];
  bySource: RevenueBySource[];
  byMonth: RevenueMonth[];
  /** Every month that has any enrolment, "YYYY-MM", oldest first. */
  months: string[];
  /** Every currency present, in `totals` order. */
  currencies: string[];
};

/**
 * One round trip. `$facet` runs the three groupings over the same matched
 * set, so the figures cannot disagree with each other the way three separate
 * queries against a moving collection could.
 */
export async function getRevenueReport(): Promise<RevenueReport | null> {
  const db = await getDb();
  if (!db) return null;

  const monthKey = {
    $dateToString: { date: "$createdAt", format: "%Y-%m", timezone: MONTH_ZONE },
  };

  const [facets] = await db
    .collection<Enrollment>(COLLECTION)
    .aggregate<{
      totals: { _id: string; minorUnits: number; count: number }[];
      bySource: { _id: { currency: string; source: EnrollmentSource }; minorUnits: number; count: number }[];
      byMonth: { _id: { currency: string; month: string }; minorUnits: number; count: number }[];
    }>([
      { $match: LIVE },
      {
        $facet: {
          totals: [
            { $group: { _id: "$currency", minorUnits: { $sum: "$amountMinorUnits" }, count: { $sum: 1 } } },
            { $sort: { minorUnits: -1 } },
          ],
          bySource: [
            {
              $group: {
                _id: { currency: "$currency", source: "$source" },
                minorUnits: { $sum: "$amountMinorUnits" },
                count: { $sum: 1 },
              },
            },
            { $sort: { minorUnits: -1 } },
          ],
          byMonth: [
            {
              $group: {
                _id: { currency: "$currency", month: monthKey },
                minorUnits: { $sum: "$amountMinorUnits" },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.month": 1 } },
          ],
        },
      },
    ])
    .toArray();

  if (!facets) return { totals: [], bySource: [], byMonth: [], months: [], currencies: [] };

  const totals: RevenueTotal[] = facets.totals.map((t) => ({
    currency: t._id,
    minorUnits: t.minorUnits,
    count: t.count,
  }));

  const bySource: RevenueBySource[] = facets.bySource.map((s) => ({
    currency: s._id.currency,
    source: s._id.source,
    minorUnits: s.minorUnits,
    count: s.count,
  }));

  const byMonth: RevenueMonth[] = facets.byMonth.map((m) => ({
    month: m._id.month,
    currency: m._id.currency,
    minorUnits: m.minorUnits,
    count: m.count,
  }));

  return {
    totals,
    bySource,
    byMonth,
    months: [...new Set(byMonth.map((m) => m.month))].sort(),
    currencies: totals.map((t) => t.currency),
  };
}

/* ── Formatting ───────────────────────────────────────
   Amounts are stored in minor units (paise, fils) because that is what every
   gateway sends; dividing happens once, here, at the point of display. */

const LOCALE: Record<string, string> = { INR: "en-IN", AED: "en-AE" };

/** Whole units — matching how the academy quotes both currencies. */
export function formatMinorUnits(minorUnits: number, currency: string): string {
  return (minorUnits / 100).toLocaleString(LOCALE[currency] ?? "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

/** "2026-09" → "Sep 2026". Parsed as UTC so the label can't slip a month.
 *  en-US rather than en-GB only for the abbreviation: en-GB alone spells
 *  September "Sept", which sits a letter wider than every other month in a
 *  chart axis. */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return month;
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** How the money arrived, for a column heading. */
export const SOURCE_LABEL: Record<EnrollmentSource, string> = {
  razorpay: "Razorpay",
  stripe: "Stripe",
  abzer: "Abzer",
  manual: "By hand",
  coupon: "Free (coupon)",
};
