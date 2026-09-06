"use client";

import { useState } from "react";
import { useAcademyAuth } from "@/components/academy-auth";

/**
 * Email and a six-digit code. No password anywhere — most people who bought
 * the programme never set one, and a code they can read off their phone is
 * fewer steps than a reset link.
 *
 * The address is deliberately not checked against the customer list before
 * sending: doing so would turn this form into a way to find out who has
 * enrolled. Anyone can hold an account; what a payment unlocks is the video.
 */
export function SignIn({ heading = "Sign in to your course" }: { heading?: string }) {
  const { requestCode, verifyCode } = useAcademyAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestCode(email.trim());
    setBusy(false);
    if (result.ok) setStep("code");
    else setError(result.error ?? "Could not send the code.");
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (!result.ok) setError(result.error ?? "That code didn't work.");
    // On success the provider flips to "authed" and this form unmounts.
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-neutral-90/20 bg-white px-4 font-noi-grotesk text-[16px] tracking-[-0.015em] outline-none transition-colors duration-150 focus:border-neutral-90";
  const buttonClass =
    "inline-flex h-12 w-full items-center justify-center rounded-xl bg-neutral-90 px-5 font-noi-grotesk text-[16px] leading-none font-medium text-white transition duration-150 ease-in-out hover:bg-neutral-100 disabled:opacity-50";

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 ring-1 ring-neutral-90/10 sm:p-8">
      <h1 className="font-noi-grotesk text-[24px] leading-[1.15] tracking-[-0.025em] sm:text-[28px]">
        {heading}
      </h1>

      {step === "email" ? (
        <form onSubmit={submitEmail} className="mt-5 flex flex-col gap-3">
          <p className="font-noi-grotesk text-[15px] leading-[1.45] text-neutral-50">
            Enter the email you enrolled with. We&rsquo;ll send you a six-digit code.
          </p>
          <label className="sr-only" htmlFor="signin-email">
            Email address
          </label>
          <input
            id="signin-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
          <button type="submit" disabled={busy || !email.trim()} className={buttonClass}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-5 flex flex-col gap-3">
          <p className="font-noi-grotesk text-[15px] leading-[1.45] text-neutral-50">
            We sent a code to <span className="text-neutral-90">{email}</span>. It expires in ten
            minutes.
          </p>
          <label className="sr-only" htmlFor="signin-code">
            Six-digit code
          </label>
          <input
            id="signin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${inputClass} text-center text-[22px] tracking-[0.4em]`}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={buttonClass}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="font-noi-grotesk text-[14px] text-neutral-50 underline underline-offset-4 transition-colors hover:text-neutral-90"
          >
            Use a different email
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 font-noi-grotesk text-[14px] leading-[1.45] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
