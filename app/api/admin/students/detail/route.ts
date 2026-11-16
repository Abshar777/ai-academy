import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { getStudentDetail } from "@/lib/watch-progress";
import { findStudentByEmail } from "@/lib/student-access";

export const runtime = "nodejs";

/**
 * One student's episode-by-episode progress, for the panel that opens over the
 * table — and the counts the delete dialog quotes before it asks.
 *
 * Takes either an account id or an email. The email form is what the payments
 * table uses: a payment row knows an address, not an account, and whether the
 * two match is exactly what the caller needs told.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const email = url.searchParams.get("email");

  let accountId = id;
  if (!accountId && email) {
    const found = await findStudentByEmail(email);
    if (!found) {
      return NextResponse.json(
        {
          error: `No course account uses ${email}. This payment can't be linked to an account, so there is nothing here to delete — find them on the Students page by name.`,
        },
        { status: 404 },
      );
    }
    accountId = found.id;
  }

  if (!accountId) {
    return NextResponse.json({ error: "Give an id or an email." }, { status: 400 });
  }

  const detail = await getStudentDetail(accountId);
  if (!detail) return NextResponse.json({ error: "No such student." }, { status: 404 });
  return NextResponse.json(detail);
}
