import { NextResponse } from "next/server";
import { getStripeClient, StripeNotConfiguredError } from "@/lib/stripe";
import { normalizeCountry, planForCountry } from "@/lib/pricing";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { computeDiscountedAmount, lookupCoupon } from "@/lib/coupons";
import { PROGRAMME_NAME, SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Opens a Stripe Checkout Session for the buyer's own plan.
 *
 * Hosted checkout rather than an embedded element: it carries 3-D Secure,
 * wallets and local card rules without this codebase handling a card number,
 * which is the difference between PCI SAQ-A and a much longer conversation.
 *
 * The amount and currency come from lib/pricing.ts via the country code, never
 * from the request body, so a tampered client cannot change the price. Payment
 * is confirmed by the webhook (app/api/stripe/webhook), never by the buyer
 * arriving back on the success URL — that is just a browser navigation.
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

  const plan = planForCountry(normalizeCountry(country));

  let amount = plan.amount;
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
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            // Smallest unit — paise for INR, fils for AED. Both hundredths,
            // as with the Razorpay route.
            currency: plan.currency.toLowerCase(),
            unit_amount: Math.round(amount * 100),
            product_data: { name: PROGRAMME_NAME },
          },
        },
      ],
      // Everything the webhook needs to record the enrolment without trusting
      // whatever comes back from the browser.
      metadata: { name, email, phone, country, couponCode: appliedCoupon },
      success_url: `${SITE_URL}/order/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/order`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[stripe] Checkout session creation failed", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
