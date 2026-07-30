import { NextResponse } from "next/server";
import { getRazorpayClient, RazorpayNotConfiguredError } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * Real enrolled-student count for the "first 50 get free access" banner
 * (see components/free-fifty-banner.tsx) — counts captured Razorpay
 * payments, the only enrolment path this codebase actually processes
 * end-to-end (AE/Tabby/Tamara still route through the team manually, see
 * lib/payment-links.ts, so they're not reflected here).
 *
 * Cached in-memory for a minute: this is a public marketing page endpoint
 * with no auth, and re-querying Razorpay's paginated payments API on every
 * page view would be wasteful and slow for what only needs to be
 * "roughly current," not real-time.
 */

let cache: { count: number; expiresAt: number } | null = null;
const CACHE_MS = 60_000;
const PAGE_SIZE = 100;
// Bounded to 5 pages (500 payments) — comfortably above what this business
// will see for a long while, and keeps this route from looping unbounded
// against a paginated third-party API.
const MAX_PAGES = 5;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ count: cache.count });
  }

  try {
    const client = getRazorpayClient();
    let count = 0;
    let skip = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { items } = await client.payments.all({ count: PAGE_SIZE, skip });
      count += items.filter((payment) => payment.status === "captured").length;
      if (items.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    cache = { count, expiresAt: Date.now() + CACHE_MS };
    return NextResponse.json({ count });
  } catch (err) {
    if (err instanceof RazorpayNotConfiguredError) {
      return NextResponse.json({ count: 0 });
    }
    console.error("Failed to fetch enrolled student count", err);
    // Serve the last known-good count rather than a scary error if Razorpay
    // hiccups — this number backs marketing copy, not a transaction.
    return NextResponse.json({ count: cache?.count ?? 0 });
  }
}
