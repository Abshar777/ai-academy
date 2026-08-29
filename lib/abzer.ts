/**
 * Abzer DMCC / BillXPro hosted-redirect gateway — AED, for the Middle East
 * countries this site doesn't charge through Razorpay (India-only, see
 * lib/razorpay.ts). Unlike Razorpay's in-page checkout, this is a full
 * redirect to Abzer's own hosted payment page; the buyer never returns to a
 * page we control until Abzer sends them back, and the actual payment
 * confirmation arrives separately via a server-to-server webhook (see
 * app/api/abzer/webhook/route.ts) — never trust the browser redirect alone.
 */

const BASE = process.env.ABZER_BASE_URL || "https://billxpro.com/as/api/v100";

export class AbzerNotConfiguredError extends Error {
  constructor() {
    super("Abzer Pay is not configured — set ABZER_ACCESS_KEY and ABZER_SECRET_KEY.");
    this.name = "AbzerNotConfiguredError";
  }
}

// Token is valid 60 min; cached module-level and refreshed at 50 to leave a
// safety margin, per Abzer's own integration guidance.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchAbzerToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const accessKey = process.env.ABZER_ACCESS_KEY;
  const secretKey = process.env.ABZER_SECRET_KEY;
  if (!accessKey || !secretKey) throw new AbzerNotConfiguredError();

  const res = await fetch(`${BASE}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey, secretKey }),
  });
  if (!res.ok) {
    throw new Error(`Abzer auth failed (${res.status}): ${await res.text().catch(() => "")}`);
  }

  const data = (await res.json()) as { token: string };
  cachedToken = { token: data.token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return data.token;
}

export type AbzerCreateOrderOptions = {
  /** Major currency units — AED, e.g. 99.00. */
  amountAED: number;
  /** Our own order id — sent as referenceNumber, echoed back as
   *  invoiceNumber in the webhook. This is how a webhook (which carries no
   *  other context) gets matched back to an order — see lib/abzer-orders.ts. */
  orderId: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
};

export type AbzerCreateOrderResult = {
  /** Abzer's own UUID for this payment request — stored for reconciliation. */
  abzerRequestId: string;
  /** The hosted payment page — redirect the buyer's browser here. */
  checkoutUrl: string;
};

export async function createAbzerOrder(
  opts: AbzerCreateOrderOptions,
): Promise<AbzerCreateOrderResult> {
  if (!process.env.ABZER_ACCESS_KEY || !process.env.ABZER_SECRET_KEY) {
    throw new AbzerNotConfiguredError();
  }
  const token = await fetchAbzerToken();

  // Abzer wants first/last name separately; a single-word name is reused
  // for both rather than left blank.
  const parts = opts.buyerName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Student";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

  const clientUrl = process.env.CLIENT_URL;
  const returnBase = `${clientUrl}/order/payment-return`;

  const createRes = await fetch(`${BASE}/direct-payment-request/extended`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      templateConfiguration: { code: process.env.ABZER_TEMPLATE_CODE || "paymentlink-mail-template" },
      firstName,
      lastName,
      email: opts.buyerEmail,
      mobileNo: opts.buyerPhone ?? "",
      amount: opts.amountAED,
      referenceNumber: opts.orderId,
      successUrl: returnBase,
      failureUrl: returnBase,
      cancelUrl: returnBase,
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Abzer create failed (${createRes.status}): ${await createRes.text().catch(() => "")}`);
  }

  const { id: abzerRequestId } = (await createRes.json()) as { id: string };
  if (!abzerRequestId) throw new Error("Abzer did not return a payment request ID.");

  const linkRes = await fetch(`${BASE}/direct-payment-request/${abzerRequestId}/link-generate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!linkRes.ok) {
    throw new Error(`Abzer link-generate failed (${linkRes.status}): ${await linkRes.text().catch(() => "")}`);
  }

  const linkData = (await linkRes.json()) as { mailLink: string; isLinkExpired: boolean };
  if (linkData.isLinkExpired || !linkData.mailLink) {
    throw new Error("Abzer returned an expired or empty payment link.");
  }

  return { abzerRequestId, checkoutUrl: linkData.mailLink };
}

export function abzerCurrency(): string {
  return process.env.ABZER_CURRENCY || "AED";
}
