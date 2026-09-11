/**
 * The `country` cookie middleware.ts sets from the visitor's IP, and the
 * manual override the country pickers write over it.
 *
 * Changing it has to reach every price on the page at once — the enrol bar,
 * the offer banner, the pricing section, any prose quoting a figure — so the
 * write broadcasts, and lib/use-country.ts subscribes. Before that, each of
 * those read the cookie once on mount and then sat on a stale currency for
 * the rest of the visit.
 */

/** Fired on the window when the country changes, so every price re-reads. */
export const COUNTRY_CHANGE_EVENT = "delta:country-change";

/** A month: long enough that a manual override survives a return visit,
 *  short enough that someone who has moved isn't stuck with the old one. */
const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Client-side read of the cookie. */
export function readCountryCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)country=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/** Persists a country choice and tells the rest of the page about it. */
export function writeCountryCookie(next: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `country=${encodeURIComponent(next)}; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}`;
  window.dispatchEvent(new CustomEvent(COUNTRY_CHANGE_EVENT, { detail: next }));
}
