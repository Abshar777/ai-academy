import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { generateInvoicePdf } from "@/lib/invoice";

export const runtime = "nodejs";

/**
 * Regenerates the same PDF sendInvoiceEmail attaches, for the "Download
 * invoice" button on /order/thank-you — that page only has orderId +
 * paymentId (from the checkout redirect, see razorpay-checkout.ts), not the
 * payment amount/name/email, so those are re-fetched from Razorpay rather
 * than trusted from the query string. The paymentId must actually belong to
 * orderId and be captured, which is what makes this safe to serve without a
 * login — the two IDs together aren't guessable, the same trust model
 * Stripe/Razorpay's own hosted receipt links use.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") ?? "";
  const paymentId = url.searchParams.get("paymentId") ?? "";

  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "Missing orderId or paymentId." }, { status: 400 });
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
