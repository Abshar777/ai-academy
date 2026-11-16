import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { deleteStudent } from "@/lib/student-access";

export const runtime = "nodejs";

/**
 * Deletes a student's account for good.
 *
 * The only destructive route in the admin panel. It takes the account id and
 * the account's email, and refuses unless they agree — see
 * lib/student-access.ts for why that pairing is the safeguard rather than a
 * formality.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const confirmEmail = typeof body?.confirmEmail === "string" ? body.confirmEmail : null;

  if (!id || !confirmEmail) {
    return NextResponse.json({ error: "Give an id and the account's email." }, { status: 400 });
  }

  const result = await deleteStudent(id, confirmEmail);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  /* Worth a line in the server log: there is no row left to audit afterwards. */
  console.info(
    `[admin] deleted student ${result.deleted.email} — ` +
      `${result.deleted.entitlements} entitlement(s), ${result.deleted.progress} progress row(s), ` +
      `${result.deleted.sessions} session(s), ${result.deleted.devices} device(s)`,
  );

  return NextResponse.json({ ok: true, deleted: result.deleted });
}
