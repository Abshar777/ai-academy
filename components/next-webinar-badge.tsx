"use client";

import { useEffect, useState } from "react";
import { formatWebinarDate, formatWebinarTime, nextWebinarDate } from "@/lib/next-webinar";

/**
 * "Next webinar: Sat, 6 Sep 2026 · 11:00 AM" — the compact version of the
 * hero's booking card (components/webinar-cta.tsx), reading the same session
 * from lib/next-webinar.ts so the two never quote different dates.
 *
 * Computed client-side rather than in the (server-rendered) Hero component,
 * since a `new Date()` read during a server render can get baked into a
 * statically-optimized page and never update. Deferred out of the effect
 * body (same pattern as order-form.tsx's saved-contact prefill) so the first
 * client render still matches the server's date-less markup for hydration.
 */

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
      const date = nextWebinarDate();
      setLabel(`${formatWebinarDate(date)} · ${formatWebinarTime(date)}`);
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
