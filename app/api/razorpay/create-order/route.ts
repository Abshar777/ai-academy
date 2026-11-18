import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRazorpayClient, RazorpayNotConfiguredError } from "@/lib/razorpay";
import { normalizeCountry, planForCountry } from "@/lib/pricing";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { computeDiscountedAmount, lookupCoupon } from "@/lib/coupons";
import { lookupOffer } from "@/lib/offers";
import { OFFER_COOKIE } from "@/lib/offer-shape";

export const runtime = "nodejs";

/**
 * Creates a Razorpay order in the currency of the buyer's own plan — rupees
 * for India, dirhams elsewhere. It used to charge INR whatever the country,
 * which is why selecting Razorpay outside India fell through to "the team
 * will reach out" instead of opening checkout.
 *
 * The plan is resolved here from the country code, so the amount and currency
 * come from lib/pricing.ts and never from anything the client sends — a
 * tampered request still can't change what gets charged.
 *
 * A coupon that fully covers the price is rejected here — Razorpay doesn't
 * support ₹0 orders, so fully-free redemptions go through
 * /api/order/free-enroll instead, never this route.
 *
 * A custom-price link replaces the plan outright. Its code travels in a
 * cookie, like the country does, and like the country it only names
 * something — the amount and currency are read from the database here, so
 * neither the URL, the cookie nor this request body can set a price.
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

  const plan = planForCountry(normalizeCountry(country));

  const offerCode = (await cookies()).get(OFFER_COOKIE)?.value?.trim() ?? "";
  const offer = offerCode ? await lookupOffer(offerCode) : null;

  /* An offer that has expired or been spent since the page was rendered stops
     checkout rather than quietly falling back to list price. Charging more
     than the figure on screen is the one outcome worth refusing over. */
  if (offer && !offer.valid) {
    return NextResponse.json({ error: offer.error }, { status: 400 });
  }

  const agreed = offer?.valid ? offer.offer : null;

  /* The agreed price is already the deal — stacking a coupon on top of it is
     nearly always a mistake, and an expensive one to find out about later. */
  if (agreed && couponCode) {
    return NextResponse.json(
      { error: "This link already carries its own price — a coupon can't be added to it." },
      { status: 400 },
    );
  }

  const currency = agreed ? agreed.currency : plan.currency;

  let amount = agreed ? agreed.amount : plan.amount;
  let appliedCoupon = "";
  if (couponCode) {
    const lookup = await lookupCoupon(couponCode);
    if (!lookup.valid) {
      return NextResponse.json({ error: lookup.error }, { status: 400 });
    }
    const discounted = computeDiscountedAmount(plan.amount, lookup.coupon);
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
      // Smallest currency unit — paise for INR, fils for AED. Both are
      // hundredths, so one conversion covers every plan we sell.
      amount: Math.round(amount * 100),
      currency,
      receipt: `order_${Date.now()}`,
      // offerCode rides back out through Razorpay and returns on the verify
      // call, so the use is counted against what was actually paid for.
      notes: { name, email, phone, country, couponCode: appliedCoupon, offerCode: agreed?.code ?? "" },
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
