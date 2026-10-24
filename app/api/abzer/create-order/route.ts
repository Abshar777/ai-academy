import { NextResponse } from "next/server";
import { createAbzerOrder, AbzerNotConfiguredError } from "@/lib/abzer";
import { createAbzerOrderRecord, generateAbzerOrderId, setAbzerRequestId } from "@/lib/abzer-orders";
import { DEFAULT_PLAN, isAbzerCountry } from "@/lib/pricing";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { computeDiscountedAmount, lookupCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

/**
 * Creates an Abzer (BillXPro) hosted payment request for the Middle East
 * plan — see the country note on lib/pricing.ts. The amount always comes
 * from DEFAULT_PLAN (optionally discounted by a coupon looked up
 * server-side), never from anything the client sends.
 *
 * Unlike Razorpay, there's no in-page checkout to hand a client secret
 * to — this returns a checkoutUrl the browser fully redirects to, and the
 * actual payment confirmation arrives later via a server-to-server webhook
 * (see app/api/abzer/webhook). A pending order record is created here so
 * that webhook has something to match against — Abzer has no fetch-order
 * endpoint of its own.
 *
 * A coupon that fully covers the price is rejected here — there's no ₹0/
 * AED 0 order to create — fully-free redemptions go through
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
  if (!isAbzerCountry(country)) {
    return NextResponse.json({ error: "Abzer Pay isn't available for this country." }, { status: 400 });
  }

  let amount = DEFAULT_PLAN.amount;
  let appliedCoupon: string | undefined;
  if (couponCode) {
    const lookup = await lookupCoupon(couponCode);
    if (!lookup.valid) {
      return NextResponse.json({ error: lookup.error }, { status: 400 });
    }
    const discounted = computeDiscountedAmount(DEFAULT_PLAN.amount, lookup.coupon);
    if (discounted === 0) {
      return NextResponse.json(
        { error: "This coupon fully covers the price — enrol free instead of through checkout." },
        { status: 400 },
      );
    }
    amount = discounted;
    appliedCoupon = lookup.coupon.code;
  }

  const orderId = generateAbzerOrderId();

  try {
    await createAbzerOrderRecord({
      orderId,
      name,
      email,
      phone,
      country,
      amountMinorUnits: Math.round(amount * 100),
      currency: DEFAULT_PLAN.currency,
      couponCode: appliedCoupon,
    });

    const { checkoutUrl, abzerRequestId } = await createAbzerOrder({
      amountAED: amount,
      orderId,
      buyerEmail: email,
      buyerName: name,
      buyerPhone: phone,
    });
    await setAbzerRequestId(orderId, abzerRequestId);

    // orderId travels with the client (stashed before the redirect) so
    // /order/payment-return knows which order to poll once Abzer sends the
    // buyer back — see components/order-form.tsx.
    return NextResponse.json({ checkoutUrl, orderId });
  } catch (err) {
    if (err instanceof AbzerNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("Abzer order creation failed", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
