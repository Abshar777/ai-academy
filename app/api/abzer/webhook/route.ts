import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAbzerOrder, markAbzerOrderPaid } from "@/lib/abzer-orders";
import { recordEnrollment } from "@/lib/enrollments";
import { sendInvoiceEmail } from "@/lib/email";
import { notifyAdminWhatsApp, notifyPaymentSuccessWhatsApp } from "@/lib/whatsapp";
import { redeemCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/**
 * The ONLY trusted confirmation that an Abzer payment actually succeeded.
 * Per Abzer's own integration guide (and a real incident it documents): an
 * earlier version of this exact flow fulfilled orders from the return-URL
 * redirect, which is just a browser navigation the buyer controls — that
 * let anyone "pay" for free. Fulfillment happens here, and only here; see
 * app/order/payment-return/page.tsx, which is read-only.
 *
 * Always returns 200 (even on a rejected/malformed webhook) — a non-200
 * makes Abzer retry indefinitely, which isn't useful once we've already
 * decided not to act on a given request.
 */
export async function POST(request: Request) {
  const ok = () => NextResponse.json({ received: true });

  const secret = process.env.ABZER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[abzer] webhook received but ABZER_WEBHOOK_SECRET is not configured");
    return ok();
  }

  const presented = request.headers.get("x-abzer-secret") ?? request.headers.get("x-apikey") ?? "";
  if (!presented || !safeEqual(presented, secret)) {
    console.error("[abzer] webhook rejected — bad or missing X-Abzer-Secret");
    return ok();
  }

  let payload: {
    type?: string;
    paymentStatus?: string;
    receiptId?: string;
    invoiceNumber?: string;
  };
  try {
    payload = await request.json();
  } catch {
    console.error("[abzer] webhook body was not valid JSON");
    return ok();
  }

  const { type, paymentStatus, invoiceNumber: orderId, receiptId } = payload;
  if (type !== "WH_RECEIPT_POSTING" || paymentStatus !== "Success" || !orderId || !receiptId) {
    // Not a success event (e.g. "Pending Approval") — nothing to fulfill yet.
    return ok();
  }

  try {
    const order = await getAbzerOrder(orderId);
    if (!order) {
      console.error(`[abzer] webhook for unknown order ${orderId}`);
      return ok();
    }

    const won = await markAbzerOrderPaid(orderId, receiptId);
    if (!won) {
      // Already fulfilled by an earlier delivery of this same webhook —
      // Abzer can retry, so this is routine, not an error.
      return ok();
    }

    await recordEnrollment({
      name: order.name,
      email: order.email,
      phone: order.phone,
      country: order.country,
      amountMinorUnits: order.amountMinorUnits,
      currency: order.currency,
      source: "abzer",
      couponCode: order.couponCode,
      abzerOrderId: order.abzerRequestId,
      abzerReceiptId: receiptId,
    });

    // Best-effort bookkeeping — the payment already succeeded above, so a
    // coupon that got exhausted by someone else in the meantime must not
    // turn an already-captured payment into an error.
    if (order.couponCode) {
      const redeemed = await redeemCoupon(order.couponCode);
      if (!redeemed) {
        console.error(
          `[abzer] order ${orderId} used coupon ${order.couponCode} but it could not be marked redeemed.`,
        );
      }
    }

    const amountLabel = `${order.currency} ${(order.amountMinorUnits / 100).toFixed(2)}`;

    let invoiceSent = false;
    try {
      const result = await sendInvoiceEmail({
        name: order.name,
        email: order.email,
        amountMinorUnits: order.amountMinorUnits,
        currency: order.currency,
        paymentId: receiptId,
        orderId,
      });
      invoiceSent = result.sent;
    } catch (err) {
      console.error("[abzer] Failed to send invoice email", err);
    }

    await Promise.allSettled([
      order.phone
        ? notifyPaymentSuccessWhatsApp(order.phone, order.name, amountLabel, order.country)
        : Promise.resolve(),
      notifyAdminWhatsApp(
        `Payment received (Abzer): ${amountLabel} from ${order.name || "Unknown"} (${order.email}${order.phone ? `, ${order.phone}` : ""})`,
      ),
    ]);

    console.info(`[abzer] order ${orderId} fulfilled — invoiceSent=${invoiceSent}`);
  } catch (err) {
    console.error("[abzer] webhook fulfillment failed", err);
  }

  return ok();
}
