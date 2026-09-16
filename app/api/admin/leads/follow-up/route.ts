import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { setFollowUp, type FollowUpTarget } from "@/lib/lead-followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marks a lead called (or not) and keeps a note on it.
 *
 * Body: `{ kind: "enrollment", id }` or `{ kind: "seminar", email, startsAt }`,
 * plus any of `called` (boolean) and `note` (string). Only the fields present
 * are written, so toggling "called" never touches the note and vice versa.
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

  const patch: { called?: boolean; note?: string } = {};
  if (body.called !== undefined) {
    if (typeof body.called !== "boolean") return NextResponse.json({ error: "called must be true or false." }, { status: 400 });
    patch.called = body.called;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== "string") return NextResponse.json({ error: "note must be text." }, { status: 400 });
    patch.note = body.note;
  }
  if (patch.called === undefined && patch.note === undefined) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const result = await setFollowUp(target, patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ followUp: result.followUp });
}
