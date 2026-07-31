import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { setCouponActive } from "@/lib/coupons";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { code } = await params;

  let body: { active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "`active` must be a boolean." }, { status: 400 });
  }

  const updated = await setCouponActive(code, body.active);
  if (!updated) {
    return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
