import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { createOffer, setOfferActive } from "@/lib/offers";
import { OFFER_CURRENCIES, type OfferCurrency } from "@/lib/offer-shape";

export const runtime = "nodejs";

/** Makes a link with its own price. */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currency = String(body?.currency ?? "") as OfferCurrency;
  if (!OFFER_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "Pick INR or AED." }, { status: 400 });
  }

  const amount = Number(body?.amount);
  const originalRaw = Number(body?.originalAmount);
  /* Unlimited arrives as null rather than 0 or a large number, so the cap is
     either a real cap or absent — nothing in between to misread. */
  const maxUses = body?.maxUses === null || body?.maxUses === undefined ? null : Number(body.maxUses);

  const result = await createOffer({
    amount,
    currency,
    originalAmount: Number.isFinite(originalRaw) && originalRaw > 0 ? originalRaw : undefined,
    note: typeof body?.note === "string" ? body.note : undefined,
    maxUses,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, offer: result.offer });
}

/** Switches a link off (or back on). Nothing is deleted — a link that took a
 *  payment is part of how that payment is explained later. */
export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!code) return NextResponse.json({ error: "Give a code." }, { status: 400 });

  const ok = await setOfferActive(code, body?.active !== false);
  if (!ok) return NextResponse.json({ error: "No such link." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
