import { MongoClient, type Db } from "mongodb";

/**
 * Singleton MongoDB connection — powers the admin panel (app/admin) and
 * coupon system (lib/coupons.ts, lib/enrollments.ts). Returns null (rather
 * than throwing) when MONGODB_URI isn't set, matching the same
 * graceful-degradation pattern as lib/email.ts and lib/razorpay.ts: the
 * public site (checkout, contact forms) must keep working even if the
 * database is never configured, or is temporarily down. Only the admin
 * panel and coupon redemption actually need this to succeed.
 *
 * Cached on `global` in dev so Next's hot-reload doesn't open a fresh
 * connection on every file save — the standard pattern for the official
 * MongoDB Node driver under Next.js.
 */

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> | null {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  return new MongoClient(uri).connect();
}

let prodClientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> | null {
  if (process.env.NODE_ENV === "development") return createClientPromise();
  if (!prodClientPromise) prodClientPromise = createClientPromise();
  return prodClientPromise;
}

export async function getDb(): Promise<Db | null> {
  const clientPromise = getClientPromise();
  if (!clientPromise) return null;
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || undefined);
}
