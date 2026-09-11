"use client";

import { useEffect, useState } from "react";
import { COUNTRY_CHANGE_EVENT, readCountryCookie } from "./country-cookie";
import { normalizeCountry } from "./pricing";

/**
 * The visitor's country, and every later change to it.
 *
 * One hook for every price on the page, so switching country on /order moves
 * the enrol bar, the offer banner's discount and any quoted figure along with
 * the form — rather than leaving the page quoting two currencies at once.
 *
 * Starts empty so the first client render matches the server's, then reads the
 * cookie a tick after mount. normalizeCountry turns "" into the India plan,
 * which is the documented default for a location we can't place — and being
 * the same starting point in every component, nothing disagrees with anything
 * else during that first frame.
 */
export function useCountry(): string {
  const [country, setCountry] = useState("");

  useEffect(() => {
    const sync = () => setCountry(readCountryCookie());

    // Deferred: the lint rule flags a setState the effect body can reach
    // synchronously, and a cookie read during render would disagree with the
    // markup it hydrates into.
    const id = window.setTimeout(sync, 0);
    window.addEventListener(COUNTRY_CHANGE_EVENT, sync);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener(COUNTRY_CHANGE_EVENT, sync);
    };
  }, []);

  return normalizeCountry(country);
}
