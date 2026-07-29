import { NextResponse } from "next/server";
import { getRazorpayClient, razorpayCurrency, RazorpayNotConfiguredError } from "@/lib/razorpay";
import { INDIA_PLAN } from "@/lib/pricing";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";

export const runtime = "nodejs";

/**
 * Creates a Razorpay order for the India plan only — see the currency note
 * on lib/razorpay.ts. The amount always comes from INDIA_PLAN, never from
 * anything the client sends, so a tampered request can't change what gets
 * charged.
 */
export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; phone?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";

  if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(phone)) {
    return NextResponse.json({ error: "Missing or invalid contact details." }, { status: 400 });
  }

  try {
    const order = await getRazorpayClient().orders.create({
      // Smallest currency unit — paise for INR, which is the only currency
      // this endpoint ever charges (see INDIA_PLAN / lib/razorpay.ts).
      amount: Math.round(INDIA_PLAN.amount * 100),
      currency: razorpayCurrency(),
      receipt: `order_${Date.now()}`,
      notes: { name, email, phone, country },
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
