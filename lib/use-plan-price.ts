"use client";

import { useActivePlan } from "./use-plan";

/**
 * The current plan's display price ("₹1,499", "AED 99") — the visitor's
 * country plan, or the fixed figure on a custom link if they arrived on one
 * — so prose that quotes a price can't contradict what /order actually
 * charges.
 *
 * Client-side by design: the country lives in a cookie, and reading it in a
 * server component would opt the whole route out of static rendering. The
 * cookie read is deferred out of the effect body (same pattern as
 * enroll-bar.tsx) so the first client render still matches the server's.
 */
export function usePlanLabel(): string {
  return useActivePlan().label;
}

/** Swaps the `{price}` token in canned copy for the live price label. */
export function withPlanPrice(text: string, label: string): string {
  return text.replace(/\{price\}/g, label);
}
