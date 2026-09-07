import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb";

/**
 * The device whitelist, shared with the course API (../academy-api writes these
 * rows at sign-in; the admin panel here approves and revokes them). A buyer may
 * have two approved devices: the first is auto-approved as their main, a second
 * is a pending request an admin approves here, and a third is refused until a
 * slot is freed. Kept in sync with academy-api/src/auth/{types,devices}.ts.
 */
export const MAX_APPROVED_DEVICES = 2;

export type DeviceStatus = "approved" | "pending" | "revoked";

type DeviceDoc = {
  _id: ObjectId;
  userId: ObjectId;
  deviceId: string;
  status: DeviceStatus;
  isMain: boolean;
  label?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  lastSeenAt?: Date;
};

const COLLECTION = "devices";

async function collection(): Promise<Collection<DeviceDoc> | null> {
  const db = await getDb();
  return db ? db.collection<DeviceDoc>(COLLECTION) : null;
}

/** A device row flattened for the admin UI, with the buyer it belongs to. */
export type DeviceView = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: DeviceStatus;
  isMain: boolean;
  label: string | null;
  ip: string | null;
  createdAt: string;
  approvedAt: string | null;
  lastSeenAt: string | null;
};

type JoinedRow = DeviceDoc & { user?: { email?: string; name?: string; phone?: string } };

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

/** Every device, pending first (the ones needing action), joined to its buyer.
 *  Returns null when Mongo isn't configured, matching the other admin libs. */
export async function listDevices(): Promise<DeviceView[] | null> {
  const coll = await collection();
  if (!coll) return null;

  const rows = (await coll
    .aggregate([
      { $addFields: { _rank: { $indexOfArray: [["pending", "approved", "revoked"], "$status"] } } },
      { $sort: { _rank: 1, createdAt: -1 } },
      { $limit: 1000 },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ])
    .toArray()) as JoinedRow[];

  return rows.map((r) => ({
    id: r._id.toHexString(),
    userId: r.userId.toHexString(),
    email: r.user?.email ?? "(unknown account)",
    name: r.user?.name ?? null,
    phone: r.user?.phone ?? null,
    status: r.status,
    isMain: Boolean(r.isMain),
    label: r.label ?? null,
    ip: r.ip ?? null,
    createdAt: iso(r.createdAt) ?? new Date(0).toISOString(),
    approvedAt: iso(r.approvedAt),
    lastSeenAt: iso(r.lastSeenAt),
  }));
}

export type ApproveResult = { ok: true } | { ok: false; reason: "not_found" | "limit" | "unavailable" };

/** Approves a device, but never past the two-device cap: if the buyer already
 *  has two approved, the admin must revoke one first. Idempotent on an
 *  already-approved device. */
export async function approveDevice(id: string): Promise<ApproveResult> {
  const coll = await collection();
  if (!coll) return { ok: false, reason: "unavailable" };
  if (!ObjectId.isValid(id)) return { ok: false, reason: "not_found" };

  const device = await coll.findOne({ _id: new ObjectId(id) });
  if (!device) return { ok: false, reason: "not_found" };
  if (device.status === "approved") return { ok: true };

  const approvedCount = await coll.countDocuments({ userId: device.userId, status: "approved" });
  if (approvedCount >= MAX_APPROVED_DEVICES) return { ok: false, reason: "limit" };

  await coll.updateOne(
    { _id: device._id },
    { $set: { status: "approved", approvedAt: new Date(), approvedBy: "admin" } },
  );
  return { ok: true };
}

export type RevokeResult = { ok: true } | { ok: false; reason: "not_found" | "unavailable" };

/** Revokes a device. Its session ends on the next refresh (academy-api
 *  re-checks the whitelist there), and the slot frees for another device. */
export async function revokeDevice(id: string): Promise<RevokeResult> {
  const coll = await collection();
  if (!coll) return { ok: false, reason: "unavailable" };
  if (!ObjectId.isValid(id)) return { ok: false, reason: "not_found" };

  const res = await coll.updateOne({ _id: new ObjectId(id) }, { $set: { status: "revoked" } });
  return res.matchedCount > 0 ? { ok: true } : { ok: false, reason: "not_found" };
}
