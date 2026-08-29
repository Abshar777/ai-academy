import { randomUUID } from "node:crypto";
import { getDb } from "./mongodb";

/**
 * Pending/completed Abzer orders — the record Razorpay's own hosted "orders"
 * API gives us for free, but Abzer doesn't expose a fetch-order endpoint.
 * Created the moment checkout starts (app/api/abzer/create-order), read and
 * flipped to "paid" only by the verified webhook (app/api/abzer/webhook) —
 * never by the return-URL page, which is read-only. See lib/abzer.ts for
 * why: the webhook is the only trusted confirmation that money moved.
 */

export type AbzerOrderStatus = "pending" | "paid";

export type AbzerOrder = {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  amountMinorUnits: number;
  currency: string;
  status: AbzerOrderStatus;
  abzerRequestId?: string;
  receiptId?: string;
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = "abzer_orders";

export function generateAbzerOrderId(): string {
  return `abzer_${randomUUID()}`;
}

export async function createAbzerOrderRecord(
  data: Omit<AbzerOrder, "status" | "createdAt" | "updatedAt">,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("MongoDB is not configured — Abzer checkout requires it.");
  const now = new Date();
  await db.collection<AbzerOrder>(COLLECTION).insertOne({
    ...data,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

/** Called right after Abzer's create-request call returns its UUID — the
 *  record is created before that call so a request that fails partway
 *  through still leaves a "pending" order behind, so this patches it in
 *  rather than requiring both values up front. Best-effort: it's only used
 *  for reconciliation, never for matching the webhook (that's orderId). */
export async function setAbzerRequestId(orderId: string, abzerRequestId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .collection<AbzerOrder>(COLLECTION)
    .updateOne({ orderId }, { $set: { abzerRequestId, updatedAt: new Date() } });
}

export async function getAbzerOrder(orderId: string): Promise<AbzerOrder | null> {
  const db = await getDb();
  if (!db) return null;
  return db.collection<AbzerOrder>(COLLECTION).findOne({ orderId });
}

/** Atomic conditional update — a webhook retry or a race with another
 *  update can't double-fulfill: only the caller that actually flips
 *  pending -> paid gets `true` back and should run fulfillment side
 *  effects. */
export async function markAbzerOrderPaid(orderId: string, receiptId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.collection<AbzerOrder>(COLLECTION).updateOne(
    { orderId, status: { $ne: "paid" } },
    { $set: { status: "paid", receiptId, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}
