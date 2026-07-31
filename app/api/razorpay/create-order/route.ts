import { NextResponse } from "next/server";
import { getRazorpayClient, razorpayCurrency, RazorpayNotConfiguredError } from "@/lib/razorpay";
import { INDIA_PLAN } from "@/lib/pricing";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { computeDiscountedAmount, lookupCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

/**
 * Creates a Razorpay order for the India plan only — see the currency note
 * on lib/razorpay.ts. The amount always comes from INDIA_PLAN (optionally
 * discounted by a coupon looked up server-side), never from anything the
 * client sends, so a tampered request can't change what gets charged.
 *
 * A coupon that fully covers the price is rejected here — Razorpay doesn't
 * support ₹0 orders, so fully-free redemptions go through
 * /api/order/free-enroll instead, never this route.
 */
export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; phone?: unknown; country?: unknown; couponCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim() : "";

  if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(phone)) {
    return NextResponse.json({ error: "Missing or invalid contact details." }, { status: 400 });
  }

  let amount = INDIA_PLAN.amount;
  let appliedCoupon = "";
  if (couponCode) {
    const lookup = await lookupCoupon(couponCode);
    if (!lookup.valid) {
      return NextResponse.json({ error: lookup.error }, { status: 400 });
    }
    const discounted = computeDiscountedAmount(INDIA_PLAN.amount, lookup.coupon);
    if (discounted === 0) {
      return NextResponse.json(
        { error: "This coupon fully covers the price — enrol free instead of through checkout." },
        { status: 400 },
      );
    }
    amount = discounted;
    appliedCoupon = lookup.coupon.code;
  }

  try {
    const order = await getRazorpayClient().orders.create({
      // Smallest currency unit — paise for INR, which is the only currency
      // this endpoint ever charges (see INDIA_PLAN / lib/razorpay.ts).
      amount: Math.round(amount * 100),
      currency: razorpayCurrency(),
      receipt: `order_${Date.now()}`,
      notes: { name, email, phone, country, couponCode: appliedCoupon },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    if (err instanceof RazorpayNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("Razorpay order creation failed", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
