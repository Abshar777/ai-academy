/**
 * WhatsApp Cloud API notification service (Meta Graph API, no third-party
 * provider). Mirrors the graceful-degradation pattern used by lib/email.ts
 * and lib/razorpay.ts — missing credentials means "skip silently", never
 * "throw and break the calling flow".
 *
 * Free-form text messages (sendWhatsAppText) only deliver to a recipient who
 * has messaged the business number within the last 24h — that's a WhatsApp
 * platform rule, not a bug here. For reliable delivery to a customer who has
 * never messaged first, a pre-approved Meta message template is required;
 * set WHATSAPP_WELCOME_TEMPLATE / WHATSAPP_PAYMENT_TEMPLATE once one exists
 * and notifyCustomerWhatsApp will use it instead of free text.
 */

import { COUNTRY_DIAL_CODES } from "./pricing";

const GRAPH_BASE = "https://graph.facebook.com";

type SendResult = { sent: boolean };

function config() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  if (!phoneNumberId || !token) return null;
  return { phoneNumberId, token, apiVersion };
}

const E164 = /^\+[1-9]\d{7,14}$/;
/** 10-digit Indian mobile numbers start 6-9 — used only to recognise a bare
 *  local number with no country code, never to guess for other countries. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Meta rejects anything that isn't strict E.164 (+<country code><number>,
 * digits only, no leading 0) with a 400 "malformed" error — see the
 * WHATSAPP_ADMIN_PHONE/order-form phone field incident this was written
 * for. Contact forms on this site don't require callers to type a country
 * code, so locally-formatted numbers ("0859...", "0501...") show up in
 * practice.
 *
 * `countryCode` (an ISO code from lib/pricing.ts's COUNTRY_OPTIONS, e.g.
 * "AE") is the customer's own country selection, threaded through from
 * whichever form collected it — that's what actually resolves a local
 * number correctly, since digit shape alone is ambiguous (UAE and Saudi
 * both dial "05X-XXXXXXX"). When no country is available (e.g. the admin
 * alert, or a caller that never had one), this falls back to recognising a
 * bare 10-digit Indian mobile as a last resort, and otherwise refuses to
 * guess rather than sending Meta a number likely wrong for the customer's
 * actual country.
 */
function normalizePhone(phone: string, countryCode?: string): string | null {
  let cleaned = phone.replace(/[\s()-]/g, "");

  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;

  if (!cleaned.startsWith("+")) {
    const trunkStripped = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
    const dialCode = countryCode ? COUNTRY_DIAL_CODES[countryCode] : undefined;
    if (dialCode) {
      cleaned = `${dialCode}${trunkStripped}`;
    } else if (INDIAN_MOBILE.test(trunkStripped)) {
      cleaned = `+91${trunkStripped}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }

  return E164.test(cleaned) ? cleaned : null;
}

type TemplateComponent = {
  type: "body";
  parameters: { type: "text"; text: string }[];
};

/**
 * Every outcome — sent, failed, or skipped — gets a single-line, greppable
 * console log (`[WA] SENT`/`[WA] FAILED`/`[WA] SKIPPED`) naming the
 * recipient and message type. This is the only way to tell, after the fact,
 * whether a "the customer says they never got it" report is a real delivery
 * failure (bad token, wrong phone number ID, Meta rejected it) versus the
 * expected 24h-window non-delivery for free-text messages, versus this code
 * never even attempting the send.
 */
async function callMessagesApi(payload: Record<string, unknown>): Promise<SendResult> {
  const to = String(payload.to ?? "unknown");
  const type = String(payload.type ?? "message");

  const conf = config();
  if (!conf) {
    console.info(`[WA] SKIPPED ${type} to ${to} — WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_TOKEN not configured`);
    return { sent: false };
  }

  console.info(`[WA] SENDING ${type} to ${to}...`);

  let res: Response;
  try {
    res = await fetch(`${GRAPH_BASE}/${conf.apiVersion}/${conf.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conf.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`[WA] FAILED ${type} to ${to} — network error`, err);
    return { sent: false };
  }

  const raw = await res.text().catch(() => "");
  let body: { error?: { message?: string; code?: number }; messages?: { id: string }[] } | null = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    // Non-JSON response — body stays null, raw is logged on the failure path below.
  }

  // Meta sometimes returns HTTP 200 with an `error` object embedded in the
  // body — checking res.ok alone would misreport those sends as successful.
  if (res.ok && !body?.error) {
    const messageId = body?.messages?.[0]?.id ?? "unknown";
    console.info(`[WA] SENT ${type} to ${to} — message id ${messageId}`);
    return { sent: true };
  }

  console.error(
    `[WA] FAILED ${type} to ${to} — HTTP ${res.status}`,
    body?.error ?? raw ?? "(no response body)",
  );
  return { sent: false };
}

export async function sendWhatsAppText(
  to: string,
  text: string,
  countryCode?: string,
): Promise<SendResult> {
  const recipient = normalizePhone(to, countryCode);
  if (!recipient) {
    console.info(`[WA] SKIPPED — "${to}" could not be normalized to a valid E.164 number`);
    return { sent: false };
  }
  return callMessagesApi({
    messaging_product: "whatsapp",
    to: recipient,
    type: "text",
    text: { body: text },
  });
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[] = [],
  language = "en",
  countryCode?: string,
): Promise<SendResult> {
  const recipient = normalizePhone(to, countryCode);
  if (!recipient) {
    console.info(`[WA] SKIPPED — "${to}" could not be normalized to a valid E.164 number`);
    return { sent: false };
  }
  const components: TemplateComponent[] | undefined = bodyParams.length
    ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
    : undefined;

  return callMessagesApi({
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: { name: templateName, language: { code: language }, ...(components ? { components } : {}) },
  });
}

/** Best-effort alert to the internal team number — WHATSAPP_ADMIN_PHONE. */
export async function notifyAdminWhatsApp(text: string): Promise<SendResult> {
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;
  if (!adminPhone) {
    console.info("[WA] SKIPPED admin alert — WHATSAPP_ADMIN_PHONE not configured");
    return { sent: false };
  }
  return sendWhatsAppText(adminPhone, text);
}

/**
 * Best-effort message to the customer/lead. Uses an approved template when
 * one is configured (works any time); otherwise falls back to free text
 * (only actually delivers within 24h of the customer messaging first).
 */
async function notifyCustomerWhatsApp(
  phone: string,
  templateEnvVar: string,
  templateParams: string[],
  fallbackText: string,
  countryCode?: string,
): Promise<SendResult> {
  if (!phone) return { sent: false };
  const templateName = process.env[templateEnvVar];
  if (templateName) {
    return sendWhatsAppTemplate(phone, templateName, templateParams, "en", countryCode);
  }
  return sendWhatsAppText(phone, fallbackText, countryCode);
}

export async function notifyWelcomeWhatsApp(
  phone: string,
  name: string,
  countryCode?: string,
): Promise<SendResult> {
  const greeting = name || "there";
  return notifyCustomerWhatsApp(
    phone,
    "WHATSAPP_WELCOME_TEMPLATE",
    [greeting],
    `Hi ${greeting}, thanks for your interest in Delta AI Academy! We've sent the full curriculum and brochure to your email. Reply here anytime with questions.`,
    countryCode,
  );
}

export async function notifyPaymentSuccessWhatsApp(
  phone: string,
  name: string,
  amountLabel: string,
  countryCode?: string,
): Promise<SendResult> {
  const greeting = name || "there";
  return notifyCustomerWhatsApp(
    phone,
    "WHATSAPP_PAYMENT_TEMPLATE",
    [greeting, amountLabel],
    `Hi ${greeting}, your payment of ${amountLabel} for Delta AI Academy is confirmed! Your invoice is on its way to your email. Welcome aboard 🎉`,
    countryCode,
  );
}
