import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { sendInvoiceEmail } from "@/lib/email";
import { notifyAdminWhatsApp, notifyPaymentSuccessWhatsApp } from "@/lib/whatsapp";
import { redeemCoupon } from "@/lib/coupons";
import { recordEnrollment } from "@/lib/enrollments";

export const runtime = "nodejs";

/**
 * Verifies the signature Razorpay's Checkout handler hands back after
 * payment — this is the step that actually confirms a payment happened,
 * rather than just trusting the client called the success callback.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#step-6-verify-payment-signature
 */
export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const expected = createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  let verified = false;
  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(razorpay_signature, "hex");
    verified = expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    verified = false;
  }

  if (!verified) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  // The invoice email is best-effort from here — the payment itself is
  // already verified above, so a broken SMTP config or a Razorpay lookup
  // hiccup shouldn't turn a successful payment into a failed response.
  let invoiceSent = false;
  try {
    const order = await getRazorpayClient().orders.fetch(razorpay_order_id);
    const notes = (order.notes ?? {}) as Record<string, unknown>;
    const name = typeof notes.name === "string" ? notes.name : "";
    const email = typeof notes.email === "string" ? notes.email : "";
    const phone = typeof notes.phone === "string" ? notes.phone : "";
    const country = typeof notes.country === "string" ? notes.country : undefined;
    const couponCode = typeof notes.couponCode === "string" ? notes.couponCode : "";
    const amountMinorUnits = Number(order.amount);
    const currency = String(order.currency);

    const { created } = await recordEnrollment({
      name,
      email,
      phone,
      country: country ?? "",
      amountMinorUnits,
      currency,
      source: "razorpay",
      couponCode: couponCode || undefined,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    // The webhook (app/api/razorpay/webhook) covers the same payment and can
    // land first. Everything below is a one-time side effect, so it only runs
    // for whichever path actually created the row — otherwise a customer gets
    // two invoices and the coupon is counted twice.
    if (!created) {
      return NextResponse.json({
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        invoiceSent: false,
      });
    }

    // Best-effort usage bookkeeping — the payment already succeeded above,
    // so a coupon that got exhausted by someone else between create-order
    // and this verify (a real but narrow race) must not turn an already-
    // captured payment into an error. The enrollment record above already
    // carries the coupon code either way.
    if (couponCode) {
      const redeemed = await redeemCoupon(couponCode);
      if (!redeemed) {
        console.error(
          `[coupons] Payment ${razorpay_payment_id} used coupon ${couponCode} but it could not be marked redeemed (already exhausted?) — usage count may be off.`,
        );
      }
    }

    if (email) {
      const result = await sendInvoiceEmail({
        name,
        email,
        amountMinorUnits,
        currency,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
      invoiceSent = result.sent;
    }

    // WhatsApp is a best-effort side channel — a failure here must never
    // turn an already-verified, already-emailed payment into an error
    // response for the customer.
    const amountLabel = `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
    await Promise.allSettled([
      phone ? notifyPaymentSuccessWhatsApp(phone, name, amountLabel, country) : Promise.resolve(),
      notifyAdminWhatsApp(
        `Payment received: ${amountLabel} from ${name || "Unknown"} (${email}${phone ? `, ${phone}` : ""})`,
      ),
    ]);
  } catch (err) {
    console.error("Failed to send invoice email", err);
  }

  return NextResponse.json({
    verified: true,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    invoiceSent,
  });
}
