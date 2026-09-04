"use client";

import { useEffect, useState } from "react";
import { normalizeCountry, planForCountry } from "./pricing";
import { readCountryCookie } from "./country-cookie";

/**
 * The current plan's display price ("₹999", "AED 99") for the visitor's
 * country, so prose that quotes a price can't contradict what /order
 * actually charges.
 *
 * Client-side by design: the country lives in a cookie, and reading it in a
 * server component would opt the whole route out of static rendering. The
 * cookie read is deferred out of the effect body (same pattern as
 * enroll-bar.tsx) so the first client render still matches the server's.
 */
export function usePlanLabel(): string {
  const [country, setCountry] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setCountry(readCountryCookie()), 0);
    return () => window.clearTimeout(id);
  }, []);

  return planForCountry(normalizeCountry(country)).label;
}

/** Swaps the `{price}` token in canned copy for the live price label. */
export function withPlanPrice(text: string, label: string): string {
  return text.replace(/\{price\}/g, label);
}
