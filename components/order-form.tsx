"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COUNTRY_OPTIONS,
  PAYMENT_METHOD_LABELS,
  normalizeCountry,
  planForCountry,
  type PaymentMethodId,
} from "@/lib/pricing";
import { paymentLinkFor } from "@/lib/payment-links";
import { loadContactDetails, saveContactDetails } from "@/lib/contact-storage";
import { sendWelcomeEmailRequest } from "@/lib/send-welcome-email-request";
import { startRazorpayCheckout } from "@/lib/razorpay-checkout";
import { CheckIcon } from "./check-icon";
import { VideoPreview } from "./video-preview";
import { FreeFiftyBanner } from "./free-fifty-banner";

const FIELD =
  "h-12 w-full rounded-lg border border-neutral-90/15 bg-white px-4 font-noi-grotesk text-[16px] tracking-[-0.015em] outline-none transition-colors duration-150 focus:border-neutral-90";
const LABEL = "font-noi-grotesk text-[14px] leading-[1.4] font-medium tracking-[-0.015em]";
const ERROR = "font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-[#c0392b]";

const INCLUDED = [
  "Four complete applications, web and mobile",
  "Five skill areas: full stack, mobile, backend, database, deployment",
  "Production deployment on Vercel, Hostinger VPS and Cloudflare",
  "No prior coding experience needed",
];

type Status = "idle" | "sending" | "error" | "no-live-link";

type AppliedCoupon = {
  code: string;
  discountType: "percent" | "fixed" | "free";
  discountValue: number;
  originalAmount: number;
  discountedAmount: number;
  currency: string;
  isFree: boolean;
};

type CouponStatus = "idle" | "checking" | "applied" | "error";

export function OrderForm({ initialCountry }: { initialCountry: string }) {
  const [country, setCountry] = useState(() => normalizeCountry(initialCountry));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<PaymentMethodId>("razorpay");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus>("idle");
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // One-time prefill from whichever form (this one, the enquiry modal, or the
  // chat widget) was filled in first — see lib/contact-storage.ts. The
  // setTimeout defers the setState out of the effect body itself (same
  // pattern as the chat widget's reset-on-open), since localStorage only
  // exists on the client and server/first-render markup must match.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = loadContactDetails();
      if (!saved) return;
      setName(saved.name);
      setEmail(saved.email);
      setPhone(saved.phone);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const plan = useMemo(() => planForCountry(country), [country]);

  // Derived, not synced via an effect: switching from AE (tabby/tamara/
  // razorpay) to IN (razorpay only) shouldn't leave "tabby" selected with no
  // matching button shown, but that's a property of what's valid to render
  // right now, not state that needs an effect keeping it in sync after the
  // fact — an effect here would just cause an extra render on every country
  // change for no benefit.
  const paymentMethod = plan.methods.includes(paymentMethodChoice)
    ? paymentMethodChoice
    : plan.methods[0];

  function handleCountryChange(next: string) {
    setCountry(next);
    // Persisted so a reload (or the next visit) keeps a manual override
    // rather than snapping back to the geo-detected default.
    document.cookie = `country=${next}; path=/; max-age=${60 * 60 * 24 * 30}`;
    // A coupon's discounted amount is priced per-country (see
    // /api/coupon/validate) — clearing it here rather than trying to keep
    // it in sync avoids showing a stale discount against the new price.
    clearCoupon();
  }

  async function handleApplyCoupon(event: React.FormEvent) {
    event.preventDefault();
    const code = couponInput.trim();
    if (!code) return;

    setCouponStatus("checking");
    setCouponError("");
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, country }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.valid) {
        setCouponStatus("error");
        setCouponError(data?.error ?? "Invalid coupon code.");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({ code: code.trim().toUpperCase(), ...data });
      setCouponStatus("applied");
    } catch {
      setCouponStatus("error");
      setCouponError("Could not check that code. Please try again.");
    }
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponStatus("idle");
    setCouponInput("");
    setCouponError("");
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      errors.email = "Please enter a valid email address.";
    if (phone.replace(/\D/g, "").length < 7) errors.phone = "Please enter a valid phone number.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const contact = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    setStatus("sending");
    console.info("Order", { ...contact, country, plan: plan.label, paymentMethod });
    saveContactDetails(contact);
    // Fired on form completion, not gated on payment — matches the enquiry
    // modal and chat form, and still goes out even if checkout below fails.
    sendWelcomeEmailRequest({ ...contact, country });

    // A fully-covering coupon skips Razorpay entirely — it doesn't support
    // ₹0 orders, and there's no live gateway for non-India plans anyway.
    // See app/api/order/free-enroll for the server-side re-validation.
    if (appliedCoupon?.isFree) {
      try {
        const res = await fetch("/api/order/free-enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...contact, country, couponCode: appliedCoupon.code }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.enrolled) {
          setErrorMessage(data?.error ?? "Could not complete free enrolment. Please try again.");
          setStatus("error");
          return;
        }
        window.location.href = "/order/thank-you";
      } catch {
        setErrorMessage("Could not complete free enrolment. Please try again.");
        setStatus("error");
      }
      return;
    }

    if (paymentMethod === "razorpay" && plan.country === "IN") {
      await startRazorpayCheckout({ ...contact, country, couponCode: appliedCoupon?.code }, {
        // Full navigation, not a status flag — the thank-you page (with its
        // own confetti + copy) IS the success state, same as how the
        // static-link fallback below navigates away on success too. The IDs
        // in the URL let that page offer an invoice download without us
        // having to pass payment details through anything less disposable.
        onSuccess: ({ orderId, paymentId }) => {
          window.location.href = `/order/thank-you?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}`;
        },
        onError: (message) => {
          setErrorMessage(message);
          setStatus("error");
        },
        onDismiss: () => setStatus("idle"),
      });
      return;
    }

    // NOTE: no real backend yet for these — point this at the real one (or a
    // form service) alongside the simulated delay below.
    await new Promise((r) => setTimeout(r, 500));
    const link = paymentLinkFor(paymentMethod);
    if (link) {
      window.location.href = link;
      return;
    }
    // No merchant account connected for this method yet — say so plainly
    // rather than linking somewhere fake or dead.
    setStatus("no-live-link");
  }

  return (
    <main className="page-surface flex min-h-screen items-start justify-center overflow-x-clip px-6 pt-28 pb-20 md:pt-36 md:pb-32">
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6 rounded-3xl bg-neutral-10 p-8 md:p-10">
          <FreeFiftyBanner />

          <div className="flex flex-col gap-2">
            <span className="font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
              Full programme
            </span>
            {appliedCoupon ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-sans-plomb text-[28px] leading-[0.9] font-semibold tracking-[-0.015em] text-neutral-50 line-through">
                  {plan.label}
                </span>
                <span className="font-sans-plomb text-[56px] leading-[0.9] font-semibold tracking-[-0.015em] text-[#5d7a00]">
                  {appliedCoupon.isFree
                    ? "FREE"
                    : `${appliedCoupon.currency} ${appliedCoupon.discountedAmount}`}
                </span>
              </div>
            ) : (
              <span className="font-sans-plomb text-[56px] leading-[0.9] font-semibold tracking-[-0.015em]">
                {plan.label}
              </span>
            )}
          </div>

          <form
            onSubmit={handleApplyCoupon}
            className="flex flex-col gap-2 border-t border-neutral-90/10 pt-6"
          >
            <label className={LABEL} htmlFor="order-coupon">
              Coupon code
            </label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-lime-30/20 px-4 py-3">
                <span className="font-noi-grotesk text-[14px] leading-[1.4] font-medium tracking-[-0.015em]">
                  <span className="tabular-nums">{appliedCoupon.code}</span> applied —{" "}
                  {appliedCoupon.isFree
                    ? "free access"
                    : appliedCoupon.discountType === "percent"
                      ? `${appliedCoupon.discountValue}% off`
                      : `${appliedCoupon.currency} ${appliedCoupon.discountValue} off`}
                </span>
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="shrink-0 font-noi-grotesk text-[13px] tracking-[-0.015em] text-neutral-50 underline underline-offset-2 hover:text-neutral-90"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="order-coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter code"
                  className={FIELD + " flex-1"}
                  aria-invalid={couponStatus === "error"}
                  aria-describedby={couponStatus === "error" ? "order-coupon-error" : undefined}
                />
                <button
                  type="submit"
                  disabled={couponStatus === "checking" || !couponInput.trim()}
                  className="h-12 shrink-0 rounded-lg border border-neutral-90 px-4 font-noi-grotesk text-[14px] leading-none font-medium transition duration-150 ease-in-out hover:bg-neutral-90/8 disabled:opacity-60"
                >
                  {couponStatus === "checking" ? "Checking…" : "Apply"}
                </button>
              </div>
            )}
            {couponStatus === "error" && couponError && (
              <p id="order-coupon-error" role="alert" className={ERROR}>
                {couponError}
              </p>
            )}
          </form>

          <ul className="flex list-none flex-col gap-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex max-w-full items-start gap-3">
                <CheckIcon className="size-3 shrink-0 translate-y-2" />
                <span className="shrink font-noi-grotesk text-[15px] leading-[1.4] tracking-[-0.015em]">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <VideoPreview />

          <div className="flex flex-col gap-2 border-t border-neutral-90/10 pt-6">
            <label className={LABEL} htmlFor="order-country">
              Country
            </label>
            <select
              id="order-country"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={FIELD}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="font-noi-grotesk text-[13px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
              Sets your price and which payment methods are available.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5 rounded-3xl bg-neutral-10 p-8 md:p-10"
        >
          <h1 className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em]">
            Your details
          </h1>

          <div className="flex flex-col gap-2">
            <label className={LABEL} htmlFor="order-name">
              Full name
            </label>
            <input
              id="order-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className={FIELD}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "order-name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="order-name-error" role="alert" className={ERROR}>
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL} htmlFor="order-email">
              Email
            </label>
            <input
              id="order-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={FIELD}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "order-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="order-email-error" role="alert" className={ERROR}>
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL} htmlFor="order-phone">
              Phone number
            </label>
            <input
              id="order-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971 50 000 0000"
              autoComplete="tel"
              className={FIELD}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "order-phone-error" : undefined}
            />
            {fieldErrors.phone && (
              <p id="order-phone-error" role="alert" className={ERROR}>
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={LABEL}>How would you like to pay?</legend>
            <div className="flex flex-wrap gap-2">
              {plan.methods.map((method) => (
                <label
                  key={method}
                  className="cursor-pointer rounded-full border border-neutral-90/15 px-4 py-2 font-noi-grotesk text-[14px] leading-none tracking-[-0.01em] transition-colors duration-150 has-checked:border-neutral-90 has-checked:bg-neutral-90 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-neutral-90 has-focus-visible:ring-offset-2"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethodChoice(method)}
                    className="sr-only"
                  />
                  {PAYMENT_METHOD_LABELS[method]}
                </label>
              ))}
            </div>
          </fieldset>

          {status === "no-live-link" && (
            <p role="status" className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
              We&rsquo;ve got your details. {PAYMENT_METHOD_LABELS[paymentMethod]}
              {" "}isn&rsquo;t connected to a live payment link yet — the team will reach out
              with how to complete payment.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className={ERROR}>
              {errorMessage || "Something went wrong. Please try again."}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-1 inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-5 font-noi-grotesk text-[18px] leading-none font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
          >
            {status === "sending"
              ? "Preparing…"
              : appliedCoupon?.isFree
                ? "Claim free access"
                : "Buy now"}
          </button>
        </form>
      </div>
    </main>
  );
}
