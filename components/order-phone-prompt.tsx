"use client";

import { useEffect, useState } from "react";

/**
 * Asks for the phone number checkout no longer requires, once the payment is
 * already through.
 *
 * Deliberately not a blocker. The money is in and the course is granted; this
 * page's job is to say so. A number is worth asking for clearly and once —
 * holding someone's purchase hostage to a field they skipped on purpose would
 * be a worse trade than not having it.
 *
 * Nothing renders until the server confirms this order actually wants one, so
 * a buyer who gave a number at checkout never sees it.
 */
export function OrderPhonePrompt({ query }: { query: string }) {
  const [state, setState] = useState<"checking" | "asking" | "saving" | "saved" | "hidden">(
    "checking",
  );
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/order/phone?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { needsPhone?: boolean }) => {
        if (!cancelled) setState(d?.needsPhone ? "asking" : "hidden");
      })
      .catch(() => {
        // The page still says "payment successful" either way; a failed check
        // is not worth showing anybody.
        if (!cancelled) setState("hidden");
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    setState("saving");
    try {
      const res = await fetch(`/api/order/phone?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => null)) as { saved?: boolean; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not save that just now.");
        setState("asking");
        return;
      }
      setState("saved");
    } catch {
      setError("Could not save that just now.");
      setState("asking");
    }
  }

  if (state === "checking" || state === "hidden") return null;

  if (state === "saved") {
    return (
      <p className="mt-6 rounded-2xl bg-neutral-10 px-5 py-4 font-noi-grotesk text-[15px] text-neutral-70">
        Thanks — we&rsquo;ve got your number.
      </p>
    );
  }

  return (
    <form onSubmit={save} className="mt-6 flex flex-col gap-3 rounded-2xl bg-neutral-10 px-5 py-5 text-left">
      <div>
        <p className="font-noi-grotesk text-[16px] font-medium tracking-[-0.015em] text-neutral-90">
          One last thing — your phone number
        </p>
        <p className="mt-1 font-noi-grotesk text-[14px] leading-[1.45] text-neutral-50">
          So we can reach you about your sessions and send your class reminders on WhatsApp.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 50 000 0000"
          aria-label="Phone number"
          aria-invalid={Boolean(error)}
          className="h-11 flex-1 rounded-lg border border-neutral-90/15 bg-white px-3.5 font-noi-grotesk text-[15px] text-neutral-90 outline-none transition-colors duration-150 placeholder:text-neutral-50 focus:border-neutral-90"
        />
        <button
          type="submit"
          disabled={state === "saving"}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-neutral-90 px-5 font-noi-grotesk text-[15px] font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <p role="alert" className="font-noi-grotesk text-[13px] text-[#c0392b]">
          {error}
        </p>
      )}
    </form>
  );
}
