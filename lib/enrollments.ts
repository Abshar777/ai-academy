import type { Collection } from "mongodb";
import { getDb } from "./mongodb";

/**
 * The one record of "someone actually enrolled" — written once, right after
 * a Razorpay payment verifies (app/api/razorpay/verify) or a free coupon
 * redeems (app/api/order/free-enroll). This is what the admin payments view
 * (app/admin/payments) and the enrolled-student count read from — Razorpay's
 * own API only knows about payments it processed, so a free/coupon
 * enrollment would be invisible to anything that only queried Razorpay.
 */

export type EnrollmentSource = "razorpay" | "abzer" | "coupon";

export type Enrollment = {
  name: string;
  email: string;
  phone: string;
  country: string;
  amountMinorUnits: number;
  currency: string;
  source: EnrollmentSource;
  couponCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  /** Abzer's own request UUID and webhook receipt id — kept separate from
   *  the razorpay* fields above rather than overloading them, since they're
   *  a different gateway's identifiers. */
  abzerOrderId?: string;
  abzerReceiptId?: string;
  createdAt: Date;
};

const COLLECTION = "enrollments";

let indexesEnsured = false;

/** Partial unique index on the Razorpay payment id — the hard guarantee that
 *  one payment can only ever produce one enrollment, even if the browser
 *  callback (app/api/razorpay/verify) and the webhook
 *  (app/api/razorpay/webhook) race each other. Partial, because coupon and
 *  Abzer rows have no razorpayPaymentId and several nulls would collide
 *  under a plain unique index. */
async function collection(): Promise<Collection<Enrollment> | null> {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<Enrollment>(COLLECTION);
  if (!indexesEnsured) {
    indexesEnsured = true;
    await coll
      .createIndex(
        { razorpayPaymentId: 1 },
        { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: "string" } } },
      )
      .catch((err) => {
        console.error("[enrollments] Failed to ensure unique index on razorpayPaymentId", err);
      });
  }
  return coll;
}

/**
 * Never throws — enrollment logging is best-effort bookkeeping, not the thing
 * that makes a payment or free redemption real. A Mongo hiccup here must not
 * turn an already-successful enrollment into an error response.
 *
 * Returns whether this call actually created the row. A Razorpay payment can
 * arrive twice (the browser callback and the webhook, in either order, plus
 * webhook retries), so callers use `created` to decide whether to fire the
 * one-time side effects — redeeming the coupon, emailing the invoice,
 * messaging on WhatsApp — rather than doing them again for a duplicate.
 */
export async function recordEnrollment(
  data: Omit<Enrollment, "createdAt">,
): Promise<{ created: boolean }> {
  try {
    const coll = await collection();
    if (!coll) {
      console.info("[enrollments] MongoDB not configured — skipping record for", data.email);
      return { created: false };
    }

    const row = { ...data, createdAt: new Date() };

    // Anything without a payment id (coupon, and Abzer — already de-duped
    // upstream by the atomic pending -> paid flip in lib/abzer-orders.ts)
    // has nothing to key on, so it inserts straight.
    if (!data.razorpayPaymentId) {
      await coll.insertOne(row);
      return { created: true };
    }

    // $setOnInsert so a second arrival is a no-op rather than an overwrite.
    const result = await coll.updateOne(
      { razorpayPaymentId: data.razorpayPaymentId },
      { $setOnInsert: row },
      { upsert: true },
    );
    return { created: result.upsertedCount > 0 };
  } catch (err) {
    // A duplicate-key error means the index did its job and another caller
    // won the race — that's the expected outcome, not a failure.
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return { created: false };
    }
    console.error("[enrollments] Failed to record enrollment", err);
    return { created: false };
  }
}

/** Returns null (not 0) when Mongo isn't configured, so callers can tell
 *  "no database" apart from "zero enrollments" and fall back accordingly. */
export async function countEnrollments(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  return db.collection<Enrollment>(COLLECTION).countDocuments();
}

export type EnrollmentStats = {
  total: number;
  paidCount: number;
  freeCount: number;
  abzerPaidCount: number;
  /** Summed across "razorpay"-source enrollments only — always INR (see
   *  lib/razorpay.ts). Kept separate from Abzer's AED total below rather
   *  than summed together, since they're different currencies. */
  totalRevenueMinorUnits: number;
  /** Summed across "abzer"-source enrollments only — always AED. */
  abzerRevenueMinorUnits: number;
};

async function sumAmount(coll: Collection<Enrollment>, source: EnrollmentSource): Promise<number> {
  const agg = await coll
    .aggregate<{ _id: null; total: number }>([
      { $match: { source } },
      { $group: { _id: null, total: { $sum: "$amountMinorUnits" } } },
    ])
    .toArray();
  return agg[0]?.total ?? 0;
}

export async function getEnrollmentStats(): Promise<EnrollmentStats | null> {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<Enrollment>(COLLECTION);

  const [total, paidCount, freeCount, abzerPaidCount, totalRevenueMinorUnits, abzerRevenueMinorUnits] =
    await Promise.all([
      coll.countDocuments(),
      coll.countDocuments({ source: "razorpay" }),
      coll.countDocuments({ source: "coupon" }),
      coll.countDocuments({ source: "abzer" }),
      sumAmount(coll, "razorpay"),
      sumAmount(coll, "abzer"),
    ]);

  return { total, paidCount, freeCount, abzerPaidCount, totalRevenueMinorUnits, abzerRevenueMinorUnits };
}

export async function listEnrollments({
  limit = 100,
  skip = 0,
}: { limit?: number; skip?: number } = {}): Promise<Enrollment[] | null> {
  const db = await getDb();
  if (!db) return null;
  return db
    .collection<Enrollment>(COLLECTION)
    .find({}, { sort: { createdAt: -1 }, limit, skip })
    .toArray();
}
