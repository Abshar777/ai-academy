"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  COUNTRY_OPTIONS,
  PAYMENT_METHOD_LABELS,
  normalizeCountry,
  planForCountry,
  type PaymentMethodId,
} from "@/lib/pricing";
import { paymentLinkFor } from "@/lib/payment-links";
import { loadContactDetails, saveContactDetails } from "@/lib/contact-storage";
import { readCountryCookie } from "@/lib/country-cookie";

/**
 * The actual enrolment flow, inline in the chat — same data and same
 * redirect-to-gateway behaviour as /order (components/order-form.tsx), just
 * compact enough to sit in a message bubble. Only ever mounted client-side
 * (after the visitor asks to join), so reading localStorage/cookies during
 * the lazy initial state is safe — there's no server render of this
 * component to mismatch against.
 */

type Status = "idle" | "sending" | "no-live-link";

const FIELD =
  "h-10 w-full rounded-lg border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[14px] tracking-[-0.015em] outline-none transition-colors duration-150 focus:border-neutral-90";
const FIELD_ERROR = "font-noi-grotesk text-[12px] leading-[1.3] tracking-[-0.01em] text-[#c0392b]";

export function ChatEnrollForm() {
  const [saved] = useState(() => loadContactDetails());
  const [country, setCountry] = useState(() => normalizeCountry(readCountryCookie()));
  const [name, setName] = useState(saved?.name ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<PaymentMethodId>("razorpay");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");

  const plan = useMemo(() => planForCountry(country), [country]);
  const paymentMethod = plan.methods.includes(paymentMethodChoice)
    ? paymentMethodChoice
    : plan.methods[0];

  function validate() {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      errors.email = "Enter a valid email address.";
    if (phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setStatus("sending");
    await new Promise((r) => setTimeout(r, 400));
    console.info("Order", {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      country,
      plan: plan.label,
      paymentMethod,
      source: "chat",
    });
    saveContactDetails({ name: name.trim(), email: email.trim(), phone: phone.trim() });

    const link = paymentLinkFor(paymentMethod);
    if (link) {
      window.location.href = link;
      return;
    }
    // No merchant account connected for this method yet — say so plainly
    // rather than linking somewhere fake or dead, same as /order.
    setStatus("no-live-link");
  }

  return status === "no-live-link" ? (
    <p className="font-noi-grotesk text-[14px] leading-[1.45] tracking-[-0.015em]">
      Got it, thanks! {PAYMENT_METHOD_LABELS[paymentMethod]}
      {" "}isn&rsquo;t connected to a live payment link yet — the team will reach out
      with how to complete payment.
    </p>
  ) : (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-2.5">
      <p className="font-noi-grotesk text-[14px] leading-[1.45] tracking-[-0.015em]">
        {plan.label} — pop in your details and pick how you&rsquo;d like to pay:
      </p>

      <div className="flex flex-col gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoComplete="name"
          className={FIELD}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name && <p className={FIELD_ERROR}>{fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={FIELD}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email && <p className={FIELD_ERROR}>{fieldErrors.email}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          autoComplete="tel"
          className={FIELD}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone && <p className={FIELD_ERROR}>{fieldErrors.phone}</p>}
      </div>

      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        aria-label="Country"
        className={FIELD}
      >
        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>

      {plan.methods.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.methods.map((method) => (
            <label
              key={method}
              className="cursor-pointer rounded-full border border-neutral-90/15 px-3 py-1 font-noi-grotesk text-[12px] leading-none tracking-[-0.01em] transition-colors duration-150 has-checked:border-neutral-90 has-checked:bg-neutral-90 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-neutral-90 has-focus-visible:ring-offset-1"
            >
              <input
                type="radio"
                name="chatPaymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethodChoice(method)}
                className="sr-only"
              />
              {PAYMENT_METHOD_LABELS[method]}
            </label>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-1 h-10 rounded-lg bg-neutral-90 font-noi-grotesk text-[14px] font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
      >
        {status === "sending" ? "Preparing your payment…" : "Continue to payment"}
      </button>
    </form>
  );
}
