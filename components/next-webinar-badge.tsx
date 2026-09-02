"use client";

import { useEffect, useState } from "react";

/**
 * "Next webinar: Sat, 6 Sep 2026 · 11:00 AM" — computed client-side rather
 * than in the (server-rendered) Hero component, since a `new Date()` read
 * during a server render can get baked into a statically-optimized page and
 * never update. Deferred out of the effect body (same pattern as
 * order-form.tsx's saved-contact prefill) so the first client render still
 * matches the server's date-less markup for hydration.
 */

function nextSaturday11am(): Date {
  const now = new Date();
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
  const date = new Date(now);
  date.setDate(now.getDate() + daysUntilSaturday);
  date.setHours(11, 0, 0, 0);
  return date;
}

function LiveDot() {
  return (
    <span className="relative flex size-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-40 opacity-75" />
      <span className="relative inline-flex size-1.5 rounded-full bg-lime-40" />
    </span>
  );
}

export function NextWebinarBadge({ className = "" }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const date = nextSaturday11am();
      const formatted = date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      setLabel(`${formatted} · ${time}`);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-lime-30/20 px-3 py-1.5 font-noi-grotesk text-[12px] leading-[1.2] font-medium tracking-[-0.01em] text-neutral-90 ${className}`}
    >
      <LiveDot />
      Next webinar: {label}
    </span>
  );
}
