import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { setEnrollmentsArchived } from "@/lib/enrollments";

export const runtime = "nodejs";

/**
 * Archive or restore enrolments in bulk.
 *
 * Nothing is deleted: archived rows drop out of the table, the revenue
 * figures and the public student count, and come back whole on restore.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids : null;
  if (!ids || ids.some((id: unknown) => typeof id !== "string")) {
    return NextResponse.json({ error: "Give a list of ids." }, { status: 400 });
  }
  const archived = body?.archived !== false;

  const result = await setEnrollmentsArchived(ids, archived);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, count: result.count });
}
