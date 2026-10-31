import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { updateEnrollment, type EnrollmentEdit } from "@/lib/enrollments";

export const runtime = "nodejs";

/** Edit one enrolment — contact details, amount, currency, source, coupon. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as EnrollmentEdit | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Only the fields the helper knows about; anything else in the body is
  // ignored rather than trusted through to the document.
  const edit: EnrollmentEdit = {};
  if (typeof body.name === "string") edit.name = body.name;
  if (typeof body.email === "string") edit.email = body.email;
  if (typeof body.phone === "string" || body.phone === null) edit.phone = body.phone;
  if (typeof body.country === "string") edit.country = body.country;
  if (typeof body.amountMinorUnits === "number") edit.amountMinorUnits = body.amountMinorUnits;
  if (typeof body.currency === "string") edit.currency = body.currency;
  if (typeof body.source === "string") edit.source = body.source;
  if (typeof body.couponCode === "string" || body.couponCode === null) {
    edit.couponCode = body.couponCode;
  }

  const result = await updateEnrollment(id, edit);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
