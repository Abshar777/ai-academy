import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { generateCoupons, listCoupons, type DiscountType } from "@/lib/coupons";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const coupons = await listCoupons();
  if (coupons === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }
  return NextResponse.json({ coupons });
}

const DISCOUNT_TYPES: DiscountType[] = ["percent", "fixed", "free"];

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: {
    quantity?: unknown;
    maxUses?: unknown;
    discountType?: unknown;
    discountValue?: unknown;
    note?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  const maxUses = Number(body.maxUses);
  const discountType = body.discountType as DiscountType;
  const discountValue = Number(body.discountValue);
  const note = typeof body.note === "string" ? body.note.trim() || undefined : undefined;

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
    return NextResponse.json({ error: "Quantity must be between 1 and 500." }, { status: 400 });
  }
  if (!Number.isInteger(maxUses) || maxUses < 1) {
    return NextResponse.json({ error: "Max uses must be at least 1." }, { status: 400 });
  }
  if (!DISCOUNT_TYPES.includes(discountType)) {
    return NextResponse.json({ error: "Invalid discount type." }, { status: 400 });
  }
  if (discountType === "percent" && (!(discountValue > 0) || discountValue > 100)) {
    return NextResponse.json({ error: "Percent discount must be between 1 and 100." }, { status: 400 });
  }
  if (discountType === "fixed" && !(discountValue > 0)) {
    return NextResponse.json({ error: "Fixed discount must be greater than 0." }, { status: 400 });
  }

  const coupons = await generateCoupons({ quantity, maxUses, discountType, discountValue, note });
  if (coupons === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }

  return NextResponse.json({ coupons });
}
