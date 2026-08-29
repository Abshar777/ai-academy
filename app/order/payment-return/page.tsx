"use client";

import { useEffect, useState } from "react";

/**
 * Where Abzer sends the buyer back after the hosted payment page — for
 * success, failure, AND cancel alike, since lib/abzer.ts points all three
 * at this same URL. This page is READ-ONLY: it polls order status and
 * never marks anything paid itself. Fulfillment happens exclusively in
 * app/api/abzer/webhook, which is the only thing Abzer itself can't have
 * the buyer forge by just navigating their browser here — see the security
 * note in lib/abzer.ts for the incident that pattern is written to avoid.
 */

type Status = "checking" | "paid" | "pending" | "not_found";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 6;

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // Stashed by order-form.tsx / chat-enroll-form.tsx right before the
    // redirect to Abzer's hosted page — Abzer's own redirect doesn't
    // reliably carry our order id back as a query param, so this is the
    // one thing we control on both ends of the round trip.
    const orderId = sessionStorage.getItem("abzerPendingOrderId");
    if (!orderId) {
      // Deferred out of the effect body — same pattern used elsewhere in
      // this codebase (e.g. order-form.tsx's saved-contact prefill) to
      // avoid a synchronous setState-in-effect.
      const id = window.setTimeout(() => setStatus("not_found"), 0);
      return () => window.clearTimeout(id);
    }

    let cancelled = false;

    async function poll(attempt: number) {
      try {
        const res = await fetch(`/api/abzer/status?orderId=${encodeURIComponent(orderId!)}`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (data?.status === "paid") {
          sessionStorage.removeItem("abzerPendingOrderId");
          window.location.href = "/order/thank-you";
          return;
        }
        if (data?.status === "not_found") {
          setStatus("not_found");
          return;
        }
      } catch {
        // Best-effort — fall through to retry/pending below.
      }

      if (cancelled) return;
      if (attempt >= MAX_ATTEMPTS) {
        setStatus("pending");
        return;
      }
      setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
    }

    poll(1);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page-surface flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-28 pb-20 text-center md:pt-36 md:pb-32">
      {status === "checking" && (
        <>
          <h1 className="font-sans-plomb text-[32px] leading-[1] font-semibold tracking-[-0.015em] md:text-[40px]">
            Confirming your payment&hellip;
          </h1>
          <p className="max-w-md font-noi-grotesk text-[16px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
            This only takes a moment.
          </p>
        </>
      )}

      {status === "pending" && (
        <>
          <h1 className="font-sans-plomb text-[32px] leading-[1] font-semibold tracking-[-0.015em] md:text-[40px]">
            Still confirming
          </h1>
          <p className="max-w-md font-noi-grotesk text-[16px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
            Your payment is still being confirmed. This can take a few minutes — you&rsquo;ll get an
            email with your invoice as soon as it&rsquo;s done. Feel free to close this page.
          </p>
        </>
      )}

      {status === "not_found" && (
        <>
          <h1 className="font-sans-plomb text-[32px] leading-[1] font-semibold tracking-[-0.015em] md:text-[40px]">
            We couldn&rsquo;t find that order
          </h1>
          <p className="max-w-md font-noi-grotesk text-[16px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
            If you completed a payment, it&rsquo;s still being processed and you&rsquo;ll get a
            confirmation email shortly. If something went wrong, please contact us.
          </p>
        </>
      )}
    </main>
  );
}
