import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { setFollowUp } from "@/lib/lead-followup";
import { LEAD_STATUSES, type FollowUpTarget, type LeadStatus } from "@/lib/lead-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marks a lead called (or not) and keeps a note on it.
 *
 * Body: `{ kind: "enrollment", id }` or `{ kind: "seminar", email, startsAt }`,
 * plus any of `called` (boolean), `status` (one of LEAD_STATUSES) and `note`
 * (string). Only the fields present are written, so changing one never
 * disturbs the others.
 */
export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Expected JSON." }, { status: 400 });

  let target: FollowUpTarget;
  if (body.kind === "enrollment" && typeof body.id === "string") {
    target = { kind: "enrollment", id: body.id };
  } else if (body.kind === "seminar" && typeof body.email === "string" && typeof body.startsAt === "string") {
    target = { kind: "seminar", email: body.email, startsAt: body.startsAt };
  } else {
    return NextResponse.json({ error: "Say which lead: an enrolment id, or a seminar email and session." }, { status: 400 });
  }

  const patch: { called?: boolean; status?: LeadStatus; note?: string } = {};
  if (body.called !== undefined) {
    if (typeof body.called !== "boolean") return NextResponse.json({ error: "called must be true or false." }, { status: 400 });
    patch.called = body.called;
  }
  if (body.status !== undefined) {
    if (!LEAD_STATUSES.includes(body.status as LeadStatus)) {
      return NextResponse.json({ error: `status must be one of ${LEAD_STATUSES.join(", ")}.` }, { status: 400 });
    }
    patch.status = body.status as LeadStatus;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== "string") return NextResponse.json({ error: "note must be text." }, { status: 400 });
    patch.note = body.note;
  }
  if (patch.called === undefined && patch.status === undefined && patch.note === undefined) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const result = await setFollowUp(target, patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ followUp: result.followUp });
}
