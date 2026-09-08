import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { constructStripeEvent } from "@/lib/stripe";
import { recordEnrollment } from "@/lib/enrollments";
import { grantCourseAccess } from "@/lib/course-access";
import { redeemCoupon } from "@/lib/coupons";
import { sendInvoiceEmail } from "@/lib/email";
import { notifyAdminWhatsApp, notifyPaymentSuccessWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * The only trusted confirmation that a Stripe payment succeeded.
 *
 * The buyer landing back on the success URL is a browser navigation they
 * control, so it confirms nothing — fulfilment happens here and only here,
 * the same rule the Abzer and Razorpay webhooks follow.
 *
 * Always answers 200, even for a rejected or malformed delivery: a non-200
 * makes Stripe retry for days, which is no use once we have decided not to
 * act on a request.
 */
function ok() {
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe] webhook arrived with no signature header");
    return ok();
  }

  // Signed over the exact bytes Stripe sent — parsing and re-serializing first
  // would change them and the signature would never match.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(raw, signature);
  } catch (err) {
    console.error("[stripe] webhook signature rejected", err);
    return ok();
  }

  if (event.type !== "checkout.session.completed") return ok();

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    console.info(`[stripe] session ${session.id} completed unpaid — nothing to fulfil`);
    return ok();
  }

  try {
    const meta = session.metadata ?? {};
    const name = meta.name ?? "";
    const email = meta.email ?? session.customer_email ?? "";
    const phone = meta.phone ?? "";
    const country = meta.country ?? "";
    const couponCode = meta.couponCode ?? "";
    const amountMinorUnits = session.amount_total ?? 0;
    const currency = (session.currency ?? "").toUpperCase();

    const { created } = await recordEnrollment({
      name,
      email,
      phone,
      country,
      amountMinorUnits,
      currency,
      source: "stripe",
      couponCode: couponCode || undefined,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    });

    // Stripe retries a delivery it thinks failed, and can send the same event
    // more than once regardless. Everything below happens once per purchase.
    if (!created) {
      console.info(`[stripe] session ${session.id} — already recorded, nothing to do`);
      return ok();
    }

    if (email) {
      await grantCourseAccess({
        email,
        name,
        phone,
        country,
        source: "stripe",
        orderRef: `stripe:${session.id}`,
      });
    }

    if (couponCode) {
      const redeemed = await redeemCoupon(couponCode);
      if (!redeemed) {
        console.error(
          `[stripe] session ${session.id} used coupon ${couponCode} but it could not be marked redeemed.`,
        );
      }
    }

    let invoiceSent = false;
    if (email) {
      try {
        const result = await sendInvoiceEmail({
          name,
          email,
          amountMinorUnits,
          currency,
          paymentId: session.id,
          orderId: session.id,
        });
        invoiceSent = result.sent;
      } catch (err) {
        console.error("[stripe] Failed to send invoice email", err);
      }
    }

    const amountLabel = `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
    await Promise.allSettled([
      phone ? notifyPaymentSuccessWhatsApp(phone, name, amountLabel, country) : Promise.resolve(),
      notifyAdminWhatsApp(
        `Payment received (Stripe): ${amountLabel} from ${name || "Unknown"} (${email}${phone ? `, ${phone}` : ""})`,
      ),
    ]);

    console.info(`[stripe] session ${session.id} fulfilled — invoiceSent=${invoiceSent}`);
  } catch (err) {
    console.error("[stripe] webhook fulfillment failed", err);
  }

  return ok();
}
