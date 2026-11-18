"use client";

import { useEffect, useState } from "react";
import { OFFER_CHANGE_EVENT, clearOfferCookie, readOfferCookie } from "./offer-cookie";
import type { ResolvedOffer } from "./offer-shape";

/**
 * The custom price this visitor arrived on, if any.
 *
 * The cookie holds a code; the price comes from the server. That costs one
 * request the first time a code is seen and nothing afterwards — the answer
 * is kept for the life of the tab, because an offer's price does not change
 * under someone while they are reading the page. Deliberately not stored in
 * the cookie alongside the code: a price in a cookie is a price the visitor
 * can edit, and a page that quotes a figure it won't charge is worse than a
 * page that takes a moment to say it.
 *
 * A dead code clears itself. Someone who follows an expired link should see
 * the ordinary price and be able to buy, not be stuck on a link that cannot
 * complete.
 */

const resolved = new Map<string, ResolvedOffer | null>();
const inFlight = new Map<string, Promise<ResolvedOffer | null>>();

async function resolveOffer(code: string): Promise<ResolvedOffer | null> {
  if (resolved.has(code)) return resolved.get(code) ?? null;

  // Six components mount at once on the home page and would otherwise ask six
  // times for the same code.
  const existing = inFlight.get(code);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(`/api/offer/validate?code=${encodeURIComponent(code)}`);
      const data = (await res.json()) as { valid?: boolean; offer?: ResolvedOffer };
      const offer = res.ok && data.valid && data.offer ? data.offer : null;
      resolved.set(code, offer);
      if (!offer) clearOfferCookie();
      return offer;
    } catch {
      // A network blip shouldn't wipe a good code — leave the cookie be and
      // fall back to ordinary pricing for this render.
      return null;
    } finally {
      inFlight.delete(code);
    }
  })();

  inFlight.set(code, request);
  return request;
}

export function useOffer(): ResolvedOffer | null {
  const [offer, setOffer] = useState<ResolvedOffer | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      const code = readOfferCookie();
      if (!code) {
        if (!cancelled) setOffer(null);
        return;
      }
      void resolveOffer(code).then((next) => {
        if (!cancelled) setOffer(next);
      });
    };

    /* Deferred past the first paint, exactly as lib/use-country.ts does it:
       reading a cookie during render would disagree with the server-rendered
       markup this hydrates into. */
    const id = window.setTimeout(sync, 0);
    window.addEventListener(OFFER_CHANGE_EVENT, sync);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
      window.removeEventListener(OFFER_CHANGE_EVENT, sync);
    };
  }, []);

  return offer;
}
