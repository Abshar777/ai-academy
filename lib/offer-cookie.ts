import { OFFER_COOKIE } from "./offer-shape";

/**
 * The offer cookie, and the broadcast that keeps every price on the page in
 * step with it — the same arrangement as lib/country-cookie.ts, and for the
 * same reason: a price appears in the enrol bar, the offer banner, the
 * pricing section and any prose quoting a figure, and they all have to change
 * together or the page quotes two prices at once.
 */

export const OFFER_CHANGE_EVENT = "delta:offer-change";

/** A week. Long enough to open the link, think about it and come back;
 *  short enough that a price quoted to one person doesn't follow a shared
 *  browser around for a month. */
const OFFER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function readOfferCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${OFFER_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function writeOfferCookie(code: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${OFFER_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${OFFER_COOKIE_MAX_AGE}`;
  window.dispatchEvent(new CustomEvent(OFFER_CHANGE_EVENT, { detail: code }));
}

/** Used when a code turns out to be dead — switched off, or already spent.
 *  Clearing it puts the visitor back on ordinary pricing instead of leaving
 *  them on a link that can't be paid. */
export function clearOfferCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${OFFER_COOKIE}=; path=/; max-age=0`;
  window.dispatchEvent(new CustomEvent(OFFER_CHANGE_EVENT, { detail: "" }));
}
