import { getDb } from "./mongodb";

/**
 * The one record of "someone actually enrolled" — written once, right after
 * a Razorpay payment verifies (app/api/razorpay/verify) or a free coupon
 * redeems (app/api/order/free-enroll). This is what the admin payments view
 * (app/admin/payments) and the enrolled-student count read from — Razorpay's
 * own API only knows about payments it processed, so a free/coupon
 * enrollment would be invisible to anything that only queried Razorpay.
 */

export type EnrollmentSource = "razorpay" | "coupon";

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
  createdAt: Date;
};

const COLLECTION = "enrollments";

/** Never throws — enrollment logging is best-effort bookkeeping, not the
 *  thing that makes a payment or free redemption real. A Mongo hiccup here
 *  must not turn an already-successful enrollment into an error response. */
export async function recordEnrollment(data: Omit<Enrollment, "createdAt">): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.info("[enrollments] MongoDB not configured — skipping record for", data.email);
      return;
    }
    await db.collection<Enrollment>(COLLECTION).insertOne({ ...data, createdAt: new Date() });
  } catch (err) {
    console.error("[enrollments] Failed to record enrollment", err);
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
  /** Summed across "razorpay"-source enrollments only — the only ones with
   *  a real charged amount, and always INR (see lib/razorpay.ts). */
  totalRevenueMinorUnits: number;
};

export async function getEnrollmentStats(): Promise<EnrollmentStats | null> {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<Enrollment>(COLLECTION);

  const [total, paidCount, freeCount, revenueAgg] = await Promise.all([
    coll.countDocuments(),
    coll.countDocuments({ source: "razorpay" }),
    coll.countDocuments({ source: "coupon" }),
    coll
      .aggregate<{ _id: null; total: number }>([
        { $match: { source: "razorpay" } },
        { $group: { _id: null, total: { $sum: "$amountMinorUnits" } } },
      ])
      .toArray(),
  ]);

  return {
    total,
    paidCount,
    freeCount,
    totalRevenueMinorUnits: revenueAgg[0]?.total ?? 0,
  };
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
