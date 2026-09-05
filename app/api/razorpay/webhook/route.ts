import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordEnrollment } from "@/lib/enrollments";
import { redeemCoupon } from "@/lib/coupons";
import { sendInvoiceEmail } from "@/lib/email";
import { notifyAdminWhatsApp, notifyPaymentSuccessWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * Razorpay's server-to-server confirmation.
 *
 * Until this existed, a Razorpay enrollment was only ever recorded by the
 * browser calling app/api/razorpay/verify from Checkout's success handler.
 * If that call never landed — tab closed, network dropped, phone died on the
 * success screen — Razorpay had captured the money and this side had no
 * record, no invoice and no coupon redemption. This closes that hole the
 * same way the Abzer flow already does: a signed message from the gateway,
 * independent of whether the customer's browser survived.
 *
 * Both paths can now fire for one payment, in either order, and Razorpay
 * retries failed deliveries. recordEnrollment is keyed on the payment id and
 * reports whether it actually created the row, so the one-time side effects
 * run exactly once no matter how many times this is called.
 *
 * Always returns 200, even when rejecting: a non-2xx makes Razorpay retry on
 * a schedule, which is pointless once we've decided not to act on a message.
 */

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const ok = () => NextResponse.json({ received: true });

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[razorpay] webhook received but RAZORPAY_WEBHOOK_SECRET is not configured");
    return ok();
  }

  // The signature is over the exact bytes Razorpay sent. Parsing first and
  // re-serialising would reorder keys and change whitespace, so the HMAC
  // would never match — the raw text has to come first.
  const raw = await request.text();
  const presented = request.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");

  if (!presented || !safeEqual(expected, presented)) {
    console.error("[razorpay] webhook rejected — bad or missing X-Razorpay-Signature");
    return ok();
  }

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error("[razorpay] webhook body was not valid JSON");
    return ok();
  }

  // Only the captured event means the money is actually settled. authorized,
  // failed and the order.* events are all no-ops here.
  if (payload.event !== "payment.captured") return ok();

  const payment = payload.payload?.payment?.entity;
  if (!payment) {
    console.error("[razorpay] payment.captured with no payment entity");
    return ok();
  }

  const paymentId = asString(payment.id);
  const orderId = asString(payment.order_id);
  if (!paymentId) {
    console.error("[razorpay] payment.captured with no payment id");
    return ok();
  }

  // The contact details were stashed in the order's notes at create-order
  // time (see app/api/razorpay/create-order), and Razorpay echoes them back
  // on the payment entity.
  const notes = (payment.notes ?? {}) as Record<string, unknown>;
  const name = asString(notes.name);
  const email = asString(notes.email);
  const phone = asString(notes.phone);
  const country = asString(notes.country);
  const couponCode = asString(notes.couponCode);
  const amountMinorUnits = Number(payment.amount) || 0;
  const currency = asString(payment.currency) || "INR";

  try {
    const { created } = await recordEnrollment({
      name,
      email,
      phone,
      country,
      amountMinorUnits,
      currency,
      source: "razorpay",
      couponCode: couponCode || undefined,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });

    // Already handled — by the browser callback, or by an earlier delivery of
    // this same webhook. Everything below has run once already.
    if (!created) {
      console.info(`[razorpay] webhook for ${paymentId} — already recorded, nothing to do`);
      return ok();
    }

    if (couponCode) {
      const redeemed = await redeemCoupon(couponCode);
      if (!redeemed) {
        console.error(
          `[razorpay] payment ${paymentId} used coupon ${couponCode} but it could not be marked redeemed.`,
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
          paymentId,
          orderId,
        });
        invoiceSent = result.sent;
      } catch (err) {
        console.error("[razorpay] Failed to send invoice email", err);
      }
    }

    const amountLabel = `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
    await Promise.allSettled([
      phone ? notifyPaymentSuccessWhatsApp(phone, name, amountLabel, country) : Promise.resolve(),
      notifyAdminWhatsApp(
        `Payment received (webhook): ${amountLabel} from ${name || "Unknown"} (${email}${phone ? `, ${phone}` : ""})`,
      ),
    ]);

    console.info(`[razorpay] payment ${paymentId} fulfilled via webhook — invoiceSent=${invoiceSent}`);
  } catch (err) {
    console.error("[razorpay] webhook fulfillment failed", err);
  }

  return ok();
}
