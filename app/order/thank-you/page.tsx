import type { Metadata } from "next";
import Link from "next/link";
import { ConfettiBurst } from "@/components/confetti-burst";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { grantCourseAccess } from "@/lib/course-access";

export const metadata: Metadata = {
  title: "Payment successful",
  robots: { index: false, follow: false },
};

/**
 * Landed on only after a real, verified payment — either Razorpay's
 * onSuccess callback in order-form.tsx / chat-enroll-form.tsx (fires once
 * app/api/razorpay/verify has confirmed the signature), or Abzer's
 * app/order/payment-return page (fires once its webhook has fulfilled the
 * order). No amount/personal specifics are rendered on this page itself
 * (that's in the invoice email the fulfillment step already sent) —
 * orderId/paymentId only pass through the URL as opaque tokens for the
 * download button below, which re-fetches and re-verifies against the
 * matching gateway itself (see app/api/invoice).
 */
/**
 * Turns a paid Stripe checkout session into a sign-in ticket.
 *
 * Never throws: this runs while rendering a page that has to say "payment
 * successful" regardless. If anything here fails the buyer simply signs in
 * with an emailed code instead, which is the same fallback every other
 * gateway has.
 */
async function ticketForStripeSession(sessionId: string | undefined): Promise<string | null> {
  if (!sessionId || !isStripeConfigured()) return null;

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;

    const meta = session.metadata ?? {};
    const email = meta.email ?? session.customer_email ?? "";
    if (!email) return null;

    // Idempotent on the order reference, and the webhook very likely granted
    // this already — this call is here for the ticket, not the access.
    const { handoffToken } = await grantCourseAccess({
      email,
      name: meta.name,
      phone: meta.phone,
      country: meta.country,
      source: "stripe",
      orderRef: `stripe:${session.id}`,
    });
    return handoffToken;
  } catch (err) {
    console.error("[thank-you] could not mint a sign-in ticket for the Stripe session", err);
    return null;
  }
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    paymentId?: string;
    ht?: string;
    session_id?: string;
  }>;
}) {
  const { orderId, paymentId, ht, session_id: stripeSessionId } = await searchParams;

  // The one-time ticket from the purchase bridge. /learn spends it on arrival
  // and strips it from the URL, so the buyer lands inside the course already
  // signed in. Absent when the course API was unreachable — they can still get
  // in with an emailed code, so the link is offered either way.
  //
  // Stripe is the exception: its ticket is minted by a webhook, which has no
  // browser to hand it to, so the buyer arrives carrying only the checkout
  // session id. That id is known to nobody but them, and Stripe is asked
  // whether it was actually paid before anything is issued against it.
  const ticket = ht ?? (await ticketForStripeSession(stripeSessionId));
  const courseHref = ticket ? `/learn?ht=${encodeURIComponent(ticket)}` : "/learn";

  const invoiceHref =
    orderId && paymentId
      ? `/api/invoice?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}`
      : null;

  return (
    <main className="page-surface flex min-h-screen flex-col items-center justify-center gap-6 overflow-x-clip px-6 pt-28 pb-20 text-center md:pt-36 md:pb-32">
      <ConfettiBurst />

      <span
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full bg-lime-30"
      >
        <svg viewBox="0 0 16 16" className="size-7" aria-hidden>
          <path
            d="M3.5 8.5l3 3 6-6.5"
            stroke="#14151c"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>

      <h1 className="font-sans-plomb text-[40px] leading-[1] font-semibold tracking-[-0.015em] md:text-[56px]">
        Payment successful
      </h1>

      <p className="max-w-md font-noi-grotesk text-[16px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
        Welcome to Delta AI Academy! Your invoice and the full course details are on their
        way to your email.
      </p>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Link
          href={courseHref}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-lime-30 px-6 font-noi-grotesk text-[16px] leading-none font-medium text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40"
        >
          Start the course
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-neutral-90 px-6 font-noi-grotesk text-[16px] leading-none font-medium transition duration-150 ease-in-out hover:bg-neutral-90/8"
        >
          Back to home
        </Link>
        {invoiceHref && (
          <a
            href={invoiceHref}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-90 px-6 font-noi-grotesk text-[16px] leading-none font-medium transition duration-150 ease-in-out hover:bg-neutral-90/8"
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path
                d="M8 1.5v9m0 0L4.5 7M8 10.5L11.5 7M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            Download invoice
          </a>
        )}
      </div>
    </main>
  );
}
