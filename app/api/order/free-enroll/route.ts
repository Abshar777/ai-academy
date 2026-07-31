import { NextResponse } from "next/server";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { planForCountry } from "@/lib/pricing";
import { computeDiscountedAmount, lookupCoupon, redeemCoupon } from "@/lib/coupons";
import { recordEnrollment } from "@/lib/enrollments";
import { sendInvoiceEmail } from "@/lib/email";
import { notifyAdminWhatsApp, notifyPaymentSuccessWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * Completes enrolment with no Razorpay involvement at all — for coupons
 * that reduce the price to exactly 0 (see lib/coupons.ts computeDiscountedAmount).
 * Razorpay doesn't support ₹0 orders, and there's no live gateway for
 * non-India plans anyway, so a fully-free coupon has to skip payment
 * entirely rather than route through create-order for an amount it can't
 * charge. Partial-discount coupons still go through the normal Razorpay
 * flow at the reduced price — see app/api/razorpay/create-order.
 */
export async function POST(request: Request) {
  let body: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    country?: unknown;
    couponCode?: unknown;
  };
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
  if (!couponCode) {
    return NextResponse.json({ error: "Missing coupon code." }, { status: 400 });
  }

  const lookup = await lookupCoupon(couponCode);
  if (!lookup.valid) {
    return NextResponse.json({ error: lookup.error }, { status: 400 });
  }

  const plan = planForCountry(country);
  const discountedAmount = computeDiscountedAmount(plan.amount, lookup.coupon);
  if (discountedAmount > 0) {
    return NextResponse.json(
      { error: "This coupon doesn't fully cover the price — apply it at checkout instead." },
      { status: 400 },
    );
  }

  const redeemed = await redeemCoupon(couponCode);
  if (!redeemed) {
    return NextResponse.json({ error: "This coupon has already been redeemed." }, { status: 409 });
  }

  await recordEnrollment({
    name,
    email,
    phone,
    country,
    amountMinorUnits: 0,
    currency: plan.currency,
    source: "coupon",
    couponCode: redeemed.code,
  });

  // Best-effort confirmation — a free enrolment is still a real one, so it
  // gets the same receipt + WhatsApp notify as a paid one, just at ₹0.
  let emailSent = false;
  try {
    const result = await sendInvoiceEmail({
      name,
      email,
      amountMinorUnits: 0,
      currency: plan.currency,
      paymentId: `coupon:${redeemed.code}`,
      orderId: `free-${redeemed.code}-${Date.now()}`,
    });
    emailSent = result.sent;
  } catch (err) {
    console.error("Failed to send free-enrolment email", err);
  }

  await Promise.allSettled([
    phone
      ? notifyPaymentSuccessWhatsApp(
          phone,
          name,
          `${plan.currency} 0.00 (free — coupon ${redeemed.code})`,
          country,
        )
      : Promise.resolve(),
    notifyAdminWhatsApp(
      `Free enrolment via coupon ${redeemed.code}: ${name || "Unknown"} (${email}${phone ? `, ${phone}` : ""})`,
    ),
  ]);

  return NextResponse.json({ enrolled: true, emailSent });
}
