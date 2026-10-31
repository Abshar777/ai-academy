import { ObjectId } from "mongodb";
import type { Collection, WithId } from "mongodb";
import { getDb } from "./mongodb";
import type { FollowUp } from "./lead-status";

/**
 * The one record of "someone actually enrolled" — written once, right after
 * a Razorpay payment verifies (app/api/razorpay/verify) or a free coupon
 * redeems (app/api/order/free-enroll). This is what the admin payments view
 * (app/admin/payments) and the enrolled-student count read from — Razorpay's
 * own API only knows about payments it processed, so a free/coupon
 * enrollment would be invisible to anything that only queried Razorpay.
 */

/**
 * How the money arrived. "manual" covers a bank transfer or cash recorded by
 * hand — academy-api's entitlement already accepts it, and without it here a
 * closing taken outside a gateway has to be filed as one of the others, which
 * quietly corrupts revenue by source.
 */
export type EnrollmentSource = "razorpay" | "stripe" | "abzer" | "coupon" | "manual";

export type Enrollment = {
  name: string;
  email: string;
  /** Optional: checkout no longer asks for one. Filled in later from the
   *  thank-you page when the buyer adds it — see app/api/order/phone. */
  phone?: string;
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
  /** Stripe Checkout Session id. Unique, and the thing a repeated webhook
   *  delivery is recognised by — same role razorpayPaymentId plays. */
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  /** Whether anyone has called this lead, and what they wrote down. Absent
   *  until an admin touches it — which reads as "not called", the default. */
  followUp?: FollowUp;
  /**
   * Archived, and when. Absent on everything that is live.
   *
   * Archiving rather than deleting, because this collection is the revenue
   * history and the public student count both — a delete silently rewrites
   * past totals with no way back. Everything that reads enrolments filters
   * these out, so an archived row is gone everywhere it matters and still
   * recoverable.
   */
  archivedAt?: Date | null;
};

const COLLECTION = "enrollments";

/** Everything not archived. Spread into each read so there is one definition
 *  of "a real enrolment" rather than four that have to agree. */
const LIVE = { archivedAt: { $in: [null, undefined] } } as const;

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
    // One index per gateway rather than one shared "paymentRef": the ids come
    // from different systems and a single field would collide the moment two
    // of them ever produced the same string.
    for (const field of ["razorpayPaymentId", "stripeSessionId"] as const) {
      await coll
        .createIndex(
          { [field]: 1 },
          { unique: true, partialFilterExpression: { [field]: { $type: "string" } } },
        )
        .catch((err) => {
          console.error(`[enrollments] Failed to ensure unique index on ${field}`, err);
        });
    }
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

    // Whichever gateway reference this row carries is what a repeat delivery
    // is recognised by. Anything without one (coupon, and Abzer — already
    // de-duped upstream by the atomic pending -> paid flip in
    // lib/abzer-orders.ts) has nothing to key on, so it inserts straight.
    const dedupe = data.razorpayPaymentId
      ? { razorpayPaymentId: data.razorpayPaymentId }
      : data.stripeSessionId
        ? { stripeSessionId: data.stripeSessionId }
        : null;

    if (!dedupe) {
      await coll.insertOne(row);
      return { created: true };
    }

    // $setOnInsert so a second arrival is a no-op rather than an overwrite.
    const result = await coll.updateOne(dedupe, { $setOnInsert: row }, { upsert: true });
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
/**
 * The phone number on a paid enrolment, and how to fill it in later.
 *
 * Checkout stopped asking for one, so the row is written without it and
 * /order/thank-you offers to add it afterwards. The caller has already proved
 * the payment is real against the gateway it belongs to — see
 * app/api/order/phone — so this only has to find the right row.
 */
export type EnrollmentRef =
  | { gateway: "razorpay"; orderId: string }
  | { gateway: "abzer"; orderId: string }
  | { gateway: "stripe"; sessionId: string };

function filterFor(ref: EnrollmentRef): Record<string, string> {
  if (ref.gateway === "razorpay") return { razorpayOrderId: ref.orderId };
  if (ref.gateway === "abzer") return { abzerOrderId: ref.orderId };
  return { stripeSessionId: ref.sessionId };
}

/** The stored number, "" when there is none, or null when no such enrolment
 *  exists — which the caller reports as "nothing to ask about" rather than an
 *  error, since a missing row is not the buyer's problem. */
export async function enrollmentPhone(ref: EnrollmentRef): Promise<string | null> {
  const coll = await collection();
  if (!coll) return null;
  const row = await coll.findOne(filterFor(ref), { projection: { phone: 1 } });
  if (!row) return null;
  return row.phone ?? "";
}

/** Writes the number the buyer added afterwards. Only ever fills a gap: a row
 *  that already has one is left alone, so a replayed request cannot overwrite
 *  a number with a different one. */
export async function setEnrollmentPhone(ref: EnrollmentRef, phone: string): Promise<boolean> {
  const coll = await collection();
  if (!coll) return false;
  const result = await coll.updateOne(
    { ...filterFor(ref), $or: [{ phone: { $exists: false } }, { phone: "" }] },
    { $set: { phone } },
  );
  return result.matchedCount > 0;
}

export async function countEnrollments(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  return db.collection<Enrollment>(COLLECTION).countDocuments(LIVE);
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
      { $match: { source, ...LIVE } },
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
      coll.countDocuments(LIVE),
      coll.countDocuments({ source: "razorpay", ...LIVE }),
      coll.countDocuments({ source: "coupon", ...LIVE }),
      coll.countDocuments({ source: "abzer", ...LIVE }),
      sumAmount(coll, "razorpay"),
      sumAmount(coll, "abzer"),
    ]);

  return { total, paidCount, freeCount, abzerPaidCount, totalRevenueMinorUnits, abzerRevenueMinorUnits };
}

export async function listEnrollments({
  limit = 100,
  skip = 0,
  archived = false,
}: { limit?: number; skip?: number; archived?: boolean } = {}): Promise<
  WithId<Enrollment>[] | null
> {
  const db = await getDb();
  if (!db) return null;
  return db
    .collection<Enrollment>(COLLECTION)
    .find(archived ? { archivedAt: { $ne: null, $exists: true } } : LIVE, {
      sort: { createdAt: -1 },
      limit,
      skip,
    })
    .toArray();
}

/** The fields the admin may change. Everything else about a row — the
 *  gateway ids, createdAt, the follow-up — is either evidence of what
 *  happened or has its own editor. */
export type EnrollmentEdit = {
  name?: string;
  email?: string;
  phone?: string | null;
  country?: string;
  amountMinorUnits?: number;
  currency?: string;
  source?: EnrollmentSource;
  couponCode?: string | null;
};

export const EDITABLE_SOURCES: EnrollmentSource[] = [
  "razorpay",
  "stripe",
  "abzer",
  "coupon",
  "manual",
];

/**
 * Edit one enrolment.
 *
 * Amount, currency and source are editable along with the contact details,
 * which means this can move revenue. That is deliberate — money arrives by
 * bank transfer often enough that the alternative is a figure nobody can
 * correct — but it is why every change stamps `updatedAt`: a total that
 * shifts should at least say when.
 *
 * An empty phone or coupon is stored as absent rather than "", so the
 * "no phone yet" checks elsewhere keep working.
 */
export async function updateEnrollment(
  id: string,
  edit: EnrollmentEdit,
): Promise<{ ok: boolean; error?: string }> {
  if (!ObjectId.isValid(id)) return { ok: false, error: "Bad id." };
  const coll = await collection();
  if (!coll) return { ok: false, error: "MongoDB is not configured." };

  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};

  if (edit.name !== undefined) {
    const name = edit.name.trim();
    if (name.length < 2) return { ok: false, error: "Name is too short." };
    set.name = name;
  }
  if (edit.email !== undefined) {
    const email = edit.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return { ok: false, error: "That email doesn't look right." };
    }
    set.email = email;
  }
  if (edit.phone !== undefined) {
    const phone = (edit.phone ?? "").trim();
    if (phone) set.phone = phone;
    else unset.phone = "";
  }
  if (edit.country !== undefined) set.country = edit.country.trim();
  if (edit.amountMinorUnits !== undefined) {
    if (!Number.isFinite(edit.amountMinorUnits) || edit.amountMinorUnits < 0) {
      return { ok: false, error: "Amount must be zero or more." };
    }
    set.amountMinorUnits = Math.round(edit.amountMinorUnits);
  }
  if (edit.currency !== undefined) {
    const currency = edit.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Currency must be three letters." };
    set.currency = currency;
  }
  if (edit.source !== undefined) {
    if (!EDITABLE_SOURCES.includes(edit.source)) return { ok: false, error: "Unknown source." };
    set.source = edit.source;
  }
  if (edit.couponCode !== undefined) {
    const code = (edit.couponCode ?? "").trim();
    if (code) set.couponCode = code;
    else unset.couponCode = "";
  }

  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    return { ok: false, error: "Nothing to change." };
  }
  set.updatedAt = new Date();

  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  const result = await coll.updateOne({ _id: new ObjectId(id) }, update);
  if (result.matchedCount === 0) return { ok: false, error: "No such enrolment." };
  return { ok: true };
}

/**
 * Archive or restore rows.
 *
 * Nothing is removed. Archived rows drop out of the table, the revenue
 * figures and the public student count together, because every read shares
 * the LIVE filter — and come back whole if this was a mistake.
 *
 * Note it does not touch course access: the entitlement lives in academy-api
 * and archiving a payment here leaves the student able to watch. That is the
 * intended behaviour, not an oversight — revoking is its own deliberate act.
 */
export async function setEnrollmentsArchived(
  ids: string[],
  archived: boolean,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const valid = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (valid.length === 0) return { ok: false, count: 0, error: "No valid ids." };
  if (valid.length !== ids.length) return { ok: false, count: 0, error: "Bad id in the list." };

  const coll = await collection();
  if (!coll) return { ok: false, count: 0, error: "MongoDB is not configured." };

  const result = await coll.updateMany(
    { _id: { $in: valid } },
    archived
      ? { $set: { archivedAt: new Date(), updatedAt: new Date() } }
      : { $set: { updatedAt: new Date() }, $unset: { archivedAt: "" } },
  );
  return { ok: true, count: result.modifiedCount };
}
