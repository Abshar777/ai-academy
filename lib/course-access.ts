/**
 * Bridges a completed payment to the course platform (../academy-api): creates
 * the buyer's account, records what they bought, and returns a one-time ticket
 * that signs their browser in.
 *
 * Every call is best-effort. The payment has already succeeded by the time
 * anything here runs, so a slow or unreachable API must never turn a captured
 * payment into an error for the customer — the failure is logged and the
 * enrolment stands. Nothing is lost either way: the buyer can sign in with an
 * emailed code, and lib/../scripts/backfill-entitlements.ts on the API side
 * grants anyone this missed.
 */

export type AccessSource = "razorpay" | "abzer" | "coupon";

export type GrantInput = {
  email: string;
  name?: string;
  phone?: string;
  country?: string;
  source: AccessSource;
  /**
   * Unique per payment, and prefixed with the gateway so entitlement rows say
   * where they came from. This is what makes granting idempotent: a webhook
   * retry, or the browser callback racing the webhook, produces one grant.
   */
  orderRef: string;
};

export type GrantResult = {
  /** Present only when the API answered. Redeem it at /auth/handoff to sign the
   *  buyer in; null means they'll sign in with a code instead. */
  handoffToken: string | null;
};

/** Long enough for a cold start, short enough that the buyer isn't left
 *  watching a spinner if the API is wedged. */
const TIMEOUT_MS = 5000;

export function isCourseAccessConfigured(): boolean {
  return Boolean(process.env.ACADEMY_API_URL && process.env.ACADEMY_API_SECRET);
}

export async function grantCourseAccess(input: GrantInput): Promise<GrantResult> {
  const baseUrl = process.env.ACADEMY_API_URL;
  const secret = process.env.ACADEMY_API_SECRET;

  if (!baseUrl || !secret) {
    console.info("[course-access] ACADEMY_API_URL/SECRET not set — skipping grant for", input.email);
    return { handoffToken: null };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/internal/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": secret },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `[course-access] grant failed for ${input.email} (${input.orderRef}): ${response.status} ${await response.text().catch(() => "")}`,
      );
      return { handoffToken: null };
    }

    const data = (await response.json()) as { handoffToken?: unknown; granted?: unknown };
    console.info(
      `[course-access] ${data.granted ? "granted" : "already granted"} ${input.source} access for ${input.email}`,
    );
    return { handoffToken: typeof data.handoffToken === "string" ? data.handoffToken : null };
  } catch (err) {
    console.error(`[course-access] grant failed for ${input.email} (${input.orderRef})`, err);
    return { handoffToken: null };
  }
}
