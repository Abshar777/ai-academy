import { NextResponse } from "next/server";
import { lookupOffer } from "@/lib/offers";

export const runtime = "nodejs";

/**
 * Turns an offer code into the price to show.
 *
 * Public, because every page the visitor opens needs the figure, and
 * read-only — displaying a price is not spending a use. The count only moves
 * when a payment has actually gone through (see /api/razorpay/verify).
 *
 * It answers with the amount and currency and nothing else: no note, no
 * usage counts, nothing about who the link was made for.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ valid: false, error: "No code given." }, { status: 400 });
  }

  const result = await lookupOffer(code);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    offer: {
      code: result.offer.code,
      amount: result.offer.amount,
      currency: result.offer.currency,
      originalAmount: result.offer.originalAmount,
    },
  });
}
