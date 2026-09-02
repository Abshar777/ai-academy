import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { generateInvoicePdf } from "@/lib/invoice";
import { getAbzerOrder } from "@/lib/abzer-orders";

export const runtime = "nodejs";

/**
 * Regenerates the same PDF sendInvoiceEmail attaches, for the "Download
 * invoice" button on /order/thank-you — that page only has orderId +
 * paymentId (from the checkout redirect, see razorpay-checkout.ts and
 * app/order/payment-return/page.tsx), not the payment amount/name/email, so
 * those are re-fetched from the gateway rather than trusted from the query
 * string. paymentId must actually belong to orderId and the payment must be
 * confirmed, which is what makes this safe to serve without a login — the
 * two IDs together aren't guessable, the same trust model Stripe/Razorpay's
 * own hosted receipt links use.
 *
 * Abzer orders (orderId prefixed "abzer_", see generateAbzerOrderId) are
 * looked up in our own abzer_orders ledger instead of Razorpay's API, since
 * Abzer has no fetch-order endpoint — paymentId there is the webhook's
 * receiptId, Abzer's equivalent confirmation token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") ?? "";
  const paymentId = url.searchParams.get("paymentId") ?? "";

  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "Missing orderId or paymentId." }, { status: 400 });
  }

  if (orderId.startsWith("abzer_")) {
    try {
      const order = await getAbzerOrder(orderId);
      if (!order || order.status !== "paid" || !order.receiptId || order.receiptId !== paymentId) {
        return NextResponse.json({ error: "Payment not found." }, { status: 404 });
      }

      const pdf = await generateInvoicePdf({
        name: order.name,
        email: order.email,
        amountMinorUnits: order.amountMinorUnits,
        currency: order.currency,
        paymentId: order.receiptId,
        orderId: order.orderId,
        date: order.updatedAt,
      });

      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Delta AI Academy Invoice ${orderId}.pdf"`,
        },
      });
    } catch (err) {
      console.error("Failed to generate Abzer invoice download", err);
      return NextResponse.json({ error: "Could not generate invoice." }, { status: 502 });
    }
  }

  try {
    const client = getRazorpayClient();
    const [order, payment] = await Promise.all([
      client.orders.fetch(orderId),
      client.payments.fetch(paymentId),
    ]);

    if (payment.order_id !== orderId || payment.status !== "captured") {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    const notes = (order.notes ?? {}) as Record<string, unknown>;
    const name = typeof notes.name === "string" ? notes.name : "";
    const email = typeof notes.email === "string" ? notes.email : "";

    const pdf = await generateInvoicePdf({
      name,
      email,
      amountMinorUnits: Number(order.amount),
      currency: String(order.currency),
      paymentId,
      orderId,
      date: new Date(Number(order.created_at) * 1000),
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Delta AI Academy Invoice ${orderId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate invoice download", err);
    return NextResponse.json({ error: "Could not generate invoice." }, { status: 502 });
  }
}
