"use client";

import { useEffect } from "react";
import { readOfferCookie, writeOfferCookie } from "@/lib/offer-cookie";

/**
 * Picks an `?offer=` code up off whatever page the link happened to point at.
 *
 * The whole point of a custom link is that it can be sent as the site's front
 * door, not just as a checkout URL — so the code has to be caught on the home
 * page, the curriculum, anywhere. This sits in the root layout and does that
 * in one place, writing the code to a cookie so the rest of the visit keeps
 * the agreed price without the link having to be in the address bar any more.
 *
 * Read from `window.location` rather than useSearchParams, which would make
 * every page using this layout opt into a Suspense boundary for a value that
 * is only ever needed in the browser.
 *
 * Renders nothing.
 */
export function OfferCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("offer")?.trim().toUpperCase();
    if (!code) return;
    // Writing broadcasts, which is what moves the prices already on screen —
    // so a visitor landing on the home page sees the agreed figure rather
    // than the list price for a moment and then a jump.
    if (code !== readOfferCookie()) writeOfferCookie(code);
  }, []);

  return null;
}
