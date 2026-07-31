import { NextResponse } from "next/server";
import { computeDiscountedAmount, lookupCoupon } from "@/lib/coupons";
import { planForCountry } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * Preview-only — /order calls this as the visitor types a code, to show
 * what it does before they commit to checkout. Never mutates usedCount
 * (that only happens on actual redemption, see /api/order/free-enroll and
 * /api/razorpay/verify) so re-checking a code, or checking one that's never
 * used, has no side effects.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid request body." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  if (!code) {
    return NextResponse.json({ valid: false, error: "Enter a coupon code." }, { status: 400 });
  }

  const result = await lookupCoupon(code);
  if (!result.valid) {
    return NextResponse.json(result);
  }

  const plan = planForCountry(country);
  const discountedAmount = computeDiscountedAmount(plan.amount, result.coupon);

  return NextResponse.json({
    valid: true,
    discountType: result.coupon.discountType,
    discountValue: result.coupon.discountValue,
    originalAmount: plan.amount,
    discountedAmount,
    currency: plan.currency,
    isFree: discountedAmount === 0,
  });
}
