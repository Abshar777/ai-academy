import { randomInt, randomUUID } from "node:crypto";
import { getDb } from "./mongodb";

/**
 * Admin-generated discount/free-access codes (app/admin/coupons) redeemed
 * from /order (see components/order-form.tsx). A batch shares a discount
 * config; each code in it is independently unique and has its own
 * maxUses/usedCount so a single code can be shared with a group and still
 * cap how many times it fires.
 */

export type DiscountType = "percent" | "fixed" | "free";

export type Coupon = {
  code: string;
  batchId: string;
  discountType: DiscountType;
  /** Percent (0-100) for "percent"; major currency units — e.g. rupees,
   *  dirhams, matching lib/pricing.ts plan amounts, NOT paise/fils — for
   *  "fixed"; ignored (0) for "free". */
  discountValue: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  note?: string;
  createdAt: Date;
};

const COLLECTION = "coupons";
// Ambiguous characters (0/O, 1/I/L) dropped so a code is easy to read back
// off a screen or read aloud without transcription errors.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

let indexesEnsured = false;

async function collection() {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<Coupon>(COLLECTION);
  if (!indexesEnsured) {
    indexesEnsured = true;
    await coll.createIndex({ code: 1 }, { unique: true }).catch((err) => {
      console.error("[coupons] Failed to ensure unique index on code", err);
    });
  }
  return coll;
}

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `DELTA-${code}`;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export type GenerateCouponsInput = {
  quantity: number;
  maxUses: number;
  discountType: DiscountType;
  discountValue: number;
  note?: string;
};

/** Generates `quantity` independently-unique codes sharing one discount
 *  config. Retries a single code (not the whole batch) on the rare unique-
 *  index collision, rather than failing the request. */
export async function generateCoupons(input: GenerateCouponsInput): Promise<Coupon[] | null> {
  const coll = await collection();
  if (!coll) return null;

  const batchId = randomUUID();
  const created: Coupon[] = [];

  for (let i = 0; i < input.quantity; i++) {
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const coupon: Coupon = {
        code: randomCode(),
        batchId,
        discountType: input.discountType,
        discountValue: input.discountType === "free" ? 0 : input.discountValue,
        maxUses: input.maxUses,
        usedCount: 0,
        active: true,
        note: input.note,
        createdAt: new Date(),
      };
      try {
        await coll.insertOne(coupon);
        created.push(coupon);
        inserted = true;
      } catch (err) {
        // 11000 = duplicate key (code collision) — regenerate and retry;
        // anything else is a real failure worth surfacing.
        if ((err as { code?: number })?.code !== 11000) throw err;
      }
    }
  }

  return created;
}

export async function listCoupons(): Promise<Coupon[] | null> {
  const coll = await collection();
  if (!coll) return null;
  return coll.find({}, { sort: { createdAt: -1 } }).toArray();
}

export async function setCouponActive(code: string, active: boolean): Promise<boolean> {
  const coll = await collection();
  if (!coll) return false;
  const result = await coll.updateOne({ code: normalizeCouponCode(code) }, { $set: { active } });
  return result.matchedCount > 0;
}

/** Applies a coupon to a plan's base price (major currency units — see
 *  lib/pricing.ts). Shared by /api/order/free-enroll (checks the result is
 *  exactly 0) and /api/razorpay/create-order (charges whatever's left). */
export function computeDiscountedAmount(
  baseAmount: number,
  coupon: Pick<Coupon, "discountType" | "discountValue">,
): number {
  if (coupon.discountType === "free") return 0;
  if (coupon.discountType === "percent") {
    return Math.max(0, Math.round(baseAmount * (1 - coupon.discountValue / 100) * 100) / 100);
  }
  return Math.max(0, Math.round((baseAmount - coupon.discountValue) * 100) / 100);
}

export type CouponLookupResult =
  | { valid: true; coupon: Coupon }
  | { valid: false; error: string };

export async function lookupCoupon(code: string): Promise<CouponLookupResult> {
  const coll = await collection();
  if (!coll) return { valid: false, error: "Coupons aren't available right now." };

  const coupon = await coll.findOne({ code: normalizeCouponCode(code) });
  if (!coupon) return { valid: false, error: "Invalid coupon code." };
  if (!coupon.active) return { valid: false, error: "This coupon is no longer active." };
  if (coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "This coupon has already been fully redeemed." };
  }
  return { valid: true, coupon };
}

/** Atomic increment gated on remaining uses — the $expr guard means two
 *  concurrent redemptions of a maxUses:1 coupon can't both succeed, unlike
 *  a lookup-then-update pair which would race. Returns the updated coupon
 *  on success, null if it couldn't be redeemed (already exhausted/inactive/
 *  gone since the caller's lookup). */
export async function redeemCoupon(code: string): Promise<Coupon | null> {
  const coll = await collection();
  if (!coll) return null;

  const result = await coll.findOneAndUpdate(
    {
      code: normalizeCouponCode(code),
      active: true,
      $expr: { $lt: ["$usedCount", "$maxUses"] },
    },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" },
  );
  return result ?? null;
}
