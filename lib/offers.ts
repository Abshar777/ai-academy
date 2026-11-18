import { randomInt } from "node:crypto";
import { getDb } from "./mongodb";
import { OFFER_CURRENCIES, type OfferCurrency } from "./offer-shape";

/**
 * Admin-made links that carry their own price.
 *
 * A coupon discounts whatever the visitor's country plan happens to be, so
 * the same code is worth a different amount in Kochi and in Dubai. An offer
 * is the other thing entirely: a figure agreed with one person, which has to
 * be that figure wherever they open the link. So it stores an amount and a
 * currency outright and never consults lib/pricing.ts.
 *
 * The link carries only the code. The price is looked up here, server-side,
 * every time it is displayed and again when the card is charged — so the URL,
 * the cookie and the request body are all just ways of naming an offer, and
 * none of them can set a price.
 */

export type Offer = {
  code: string;
  /** Major units — rupees or dirhams, matching lib/pricing.ts, not paise. */
  amount: number;
  currency: OfferCurrency;
  /** Struck through next to the price. Display only, never charged. */
  originalAmount?: number;
  /** Who it was made for, so a list of codes is readable a month later. */
  note?: string;
  /** null is unlimited. A number is a hard cap, enforced atomically. */
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: Date;
};

const COLLECTION = "offers";

/* Same unambiguous alphabet as the coupon codes: no 0/O, no 1/I/L, because
   these get read down a phone and typed out of a WhatsApp message. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

/** A sane ceiling. Not a business rule — a guard against a stray keystroke
 *  turning AED 99 into AED 99000 on a link that then goes out by email. */
const MAX_AMOUNT = 1_000_000;

let indexesEnsured = false;

async function collection() {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<Offer>(COLLECTION);
  if (!indexesEnsured) {
    indexesEnsured = true;
    await coll.createIndex({ code: 1 }, { unique: true }).catch((err) => {
      console.error("[offers] Failed to ensure unique index on code", err);
    });
  }
  return coll;
}

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function normalizeOfferCode(code: string): string {
  return code.trim().toUpperCase();
}

export type CreateOfferInput = {
  amount: number;
  currency: OfferCurrency;
  originalAmount?: number;
  note?: string;
  maxUses: number | null;
};

export type CreateOfferResult =
  | { ok: true; offer: Offer }
  | { ok: false; error: string };

export async function createOffer(input: CreateOfferInput): Promise<CreateOfferResult> {
  const coll = await collection();
  if (!coll) return { ok: false, error: "The database isn't configured." };

  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Give an amount above zero." };
  }
  if (amount > MAX_AMOUNT) {
    return { ok: false, error: `That's over ${MAX_AMOUNT.toLocaleString("en-IN")} — check the figure.` };
  }
  if (!OFFER_CURRENCIES.includes(input.currency)) {
    return { ok: false, error: "Currency has to be INR or AED." };
  }

  const originalAmount =
    input.originalAmount && input.originalAmount > amount
      ? Math.round(Number(input.originalAmount) * 100) / 100
      : undefined;

  if (input.maxUses !== null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
    return { ok: false, error: "Uses has to be a whole number, or unlimited." };
  }

  // Retries the code, not the request: a collision on six characters is rare
  // but it is not impossible, and failing an admin's form over it would be
  // silly.
  for (let attempt = 0; attempt < 5; attempt++) {
    const offer: Offer = {
      code: randomCode(),
      amount,
      currency: input.currency,
      originalAmount,
      note: input.note?.trim() || undefined,
      maxUses: input.maxUses,
      usedCount: 0,
      active: true,
      createdAt: new Date(),
    };
    try {
      await coll.insertOne(offer);
      return { ok: true, offer };
    } catch (err) {
      if ((err as { code?: number })?.code !== 11000) throw err;
    }
  }
  return { ok: false, error: "Couldn't allocate a code. Try again." };
}

export async function listOffers(): Promise<Offer[] | null> {
  const coll = await collection();
  if (!coll) return null;
  return coll.find({}, { sort: { createdAt: -1 } }).toArray();
}

export async function setOfferActive(code: string, active: boolean): Promise<boolean> {
  const coll = await collection();
  if (!coll) return false;
  const result = await coll.updateOne({ code: normalizeOfferCode(code) }, { $set: { active } });
  return result.matchedCount > 0;
}

export type OfferLookup =
  | { valid: true; offer: Offer }
  | { valid: false; error: string };

/**
 * Resolves a code to its price. Read-only: the price is shown on every page
 * the visitor opens, so this runs far more often than a payment and must
 * never count as one.
 */
export async function lookupOffer(code: string): Promise<OfferLookup> {
  const coll = await collection();
  if (!coll) return { valid: false, error: "Offers aren't available right now." };

  const offer = await coll.findOne({ code: normalizeOfferCode(code) });
  if (!offer) return { valid: false, error: "This link isn't valid any more." };
  if (!offer.active) return { valid: false, error: "This link has been switched off." };
  if (offer.maxUses !== null && offer.usedCount >= offer.maxUses) {
    return { valid: false, error: "This link has already been used." };
  }
  return { valid: true, offer };
}

/**
 * Counts one use, atomically, once a payment has actually succeeded.
 *
 * The guard is in the query rather than in a read-then-write, so two people
 * opening a single-use link at the same moment cannot both get through.
 * Unlimited links match on `maxUses: null` and simply increment.
 */
export async function redeemOffer(code: string): Promise<Offer | null> {
  const coll = await collection();
  if (!coll) return null;

  const result = await coll.findOneAndUpdate(
    {
      code: normalizeOfferCode(code),
      active: true,
      $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }],
    },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" },
  );
  return result ?? null;
}
