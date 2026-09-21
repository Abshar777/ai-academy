import { NextResponse } from "next/server";
import { isValidPhone } from "@/lib/contact-validation";
import { enrollmentPhone, setEnrollmentPhone, type EnrollmentRef } from "@/lib/enrollments";
import { getRazorpayClient } from "@/lib/razorpay";
import { getAbzerOrder } from "@/lib/abzer-orders";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The phone number checkout no longer asks for, collected on /order/thank-you
 * once the money is already in.
 *
 * There is no login here, so the payment reference is the credential — exactly
 * the model app/api/invoice uses to serve a receipt: an order id and its
 * payment id are not guessable together, and both are checked against the
 * gateway that issued them rather than believed. A reference that does not
 * resolve to a paid order gets the same answer as one that does not exist.
 *
 * GET says whether this order still wants a number; POST writes one, and only
 * into a gap — a row that already has a number is never overwritten, so a
 * replayed or tampered request cannot change one.
 */

type Resolved = { ok: true; ref: EnrollmentRef } | { ok: false };

/** Proves the reference names a real, paid order before anything is written. */
async function resolve(params: URLSearchParams): Promise<Resolved> {
  const orderId = params.get("orderId") ?? "";
  const paymentId = params.get("paymentId") ?? "";
  const sessionId = params.get("session_id") ?? "";

  if (sessionId) {
    if (!isStripeConfigured()) return { ok: false };
    try {
      const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") return { ok: false };
      return { ok: true, ref: { gateway: "stripe", sessionId } };
    } catch {
      return { ok: false };
    }
  }

  if (!orderId || !paymentId) return { ok: false };

  if (orderId.startsWith("abzer_")) {
    try {
      const order = await getAbzerOrder(orderId);
      // receiptId is Abzer's confirmation token, the counterpart to Razorpay's
      // payment id — it has to match, not merely exist.
      if (!order || order.status !== "paid" || !order.receiptId || order.receiptId !== paymentId) {
        return { ok: false };
      }
      return { ok: true, ref: { gateway: "abzer", orderId } };
    } catch {
      return { ok: false };
    }
  }

  try {
    const payment = await getRazorpayClient().payments.fetch(paymentId);
    if (payment.order_id !== orderId || payment.status !== "captured") return { ok: false };
    return { ok: true, ref: { gateway: "razorpay", orderId } };
  } catch {
    return { ok: false };
  }
}

export async function GET(request: Request) {
  const resolved = await resolve(new URL(request.url).searchParams);
  // Deliberately not an error: the thank-you page asks this on every visit, and
  // a reference it cannot place simply means there is nothing to ask for.
  if (!resolved.ok) return NextResponse.json({ needsPhone: false });

  const phone = await enrollmentPhone(resolved.ref);
  return NextResponse.json({ needsPhone: phone === "" });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  // Required here, unlike at checkout: somebody has chosen to give it.
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }

  const resolved = await resolve(url.searchParams);
  if (!resolved.ok) {
    return NextResponse.json({ error: "We could not match that order." }, { status: 404 });
  }

  const saved = await setEnrollmentPhone(resolved.ref, phone);
  if (!saved) {
    // Either the row is gone or it already has a number. Both are fine from
    // here: the buyer has nothing to fix, and nothing should be overwritten.
    return NextResponse.json({ saved: false });
  }
  return NextResponse.json({ saved: true });
}
