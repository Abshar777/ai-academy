import { NextResponse } from "next/server";
import { getRazorpayClient, RazorpayNotConfiguredError } from "@/lib/razorpay";
import { countEnrollments } from "@/lib/enrollments";

export const runtime = "nodejs";

/**
 * Real enrolled-student count for the "first 50 get free access" banner
 * (see components/free-fifty-banner.tsx).
 *
 * Prefers MongoDB's `enrollments` collection — the real record of every
 * enrolment, paid or free-via-coupon (see lib/enrollments.ts,
 * app/api/razorpay/verify, app/api/order/free-enroll). Falls back to
 * counting captured Razorpay payments directly when MongoDB isn't
 * configured — accurate for paid India enrolments, just blind to free/
 * coupon ones, which is the best this route can do without a database.
 *
 * Cached in-memory for a minute: this is a public marketing page endpoint
 * with no auth, and re-querying on every page view would be wasteful for
 * what only needs to be "roughly current," not real-time.
 */

let cache: { count: number; expiresAt: number } | null = null;
const CACHE_MS = 60_000;
const PAGE_SIZE = 100;
// Bounded to 5 pages (500 payments) — comfortably above what this business
// will see for a long while, and keeps the Razorpay fallback from looping
// unbounded against a paginated third-party API.
const MAX_PAGES = 5;

async function countFromRazorpay(): Promise<number> {
  const client = getRazorpayClient();
  let count = 0;
  let skip = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { items } = await client.payments.all({ count: PAGE_SIZE, skip });
    count += items.filter((payment) => payment.status === "captured").length;
    if (items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return count;
}

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ count: cache.count });
  }

  try {
    const mongoCount = await countEnrollments();
    const count = mongoCount !== null ? mongoCount : await countFromRazorpay();
    cache = { count, expiresAt: Date.now() + CACHE_MS };
    return NextResponse.json({ count });
  } catch (err) {
    if (err instanceof RazorpayNotConfiguredError) {
      return NextResponse.json({ count: 0 });
    }
    console.error("Failed to fetch enrolled student count", err);
    // Serve the last known-good count rather than a scary error if the
    // source hiccups — this number backs marketing copy, not a transaction.
    return NextResponse.json({ count: cache?.count ?? 0 });
  }
}
