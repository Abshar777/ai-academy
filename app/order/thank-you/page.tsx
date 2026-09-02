import type { Metadata } from "next";
import Link from "next/link";
import { ConfettiBurst } from "@/components/confetti-burst";

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
export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paymentId?: string }>;
}) {
  const { orderId, paymentId } = await searchParams;
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
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-6 font-noi-grotesk text-[16px] leading-none font-medium text-white transition duration-150 ease-in-out hover:bg-neutral-70"
        >
          Back to home
        </Link>
        <Link
          href="/course"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-neutral-90 px-6 font-noi-grotesk text-[16px] leading-none font-medium transition duration-150 ease-in-out hover:bg-neutral-90/8"
        >
          View the curriculum
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
