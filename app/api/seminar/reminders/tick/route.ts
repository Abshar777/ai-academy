import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDueReminders } from "@/lib/seminar-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One scheduler tick, for an external cron.
 *
 * The in-process scheduler in instrumentation.ts is the usual driver on a
 * long-running server. This exists for hosts that would rather call a URL every
 * minute — or as a backstop beside it: both go through runDueReminders, which
 * claims each send before making it, so the two cannot double up.
 *
 * Guarded by SEMINAR_CRON_SECRET in an X-Cron-Secret header. Unset, the route
 * refuses everything rather than defaulting to open.
 */
export async function POST(request: Request) {
  const expected = process.env.SEMINAR_CRON_SECRET ?? "";
  const presented = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return NextResponse.json({ error: "SEMINAR_CRON_SECRET is not set." }, { status: 503 });

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return NextResponse.json(await runDueReminders());
}
