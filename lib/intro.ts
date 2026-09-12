"use client";

import { useEffect, useState } from "react";

/**
 * Tiny broadcast for "the intro curtain has finished".
 *
 * The curtain and the hero are siblings in the tree, so a context provider
 * would mean wrapping the whole page just to pass one boolean. A module-level
 * bus keeps the wiring to a single import on each side, and any component that
 * mounts after the curtain is already gone still gets told immediately.
 *
 * Everything above the fold is held still until this fires — otherwise the
 * hero would play its entrance behind the curtain and be finished by the time
 * the page is revealed.
 */

let complete = false;
const waiting = new Set<() => void>();
let fallback: number | undefined;

/** Longest the page will ever wait, if the curtain never reports in. */
const FAILSAFE = 4500;

/**
 * Whether a curtain is going to play at all.
 *
 * components/preloader.tsx is the only thing that ever calls completeIntro,
 * and app/page.tsx is the only thing that renders it — so on every other
 * route nobody was ever going to report in, and FAILSAFE was doing the
 * releasing. That is 4.5 seconds of hidden header, held Reveal and frozen
 * Stagger on /seminar, /order, /course and /watch, waiting out an error
 * timeout for an animation that was never scheduled.
 *
 * Read from the URL at call time rather than captured once: subscribers run
 * from effects, by which point the App Router has already updated it.
 */
function curtainWillPlay(): boolean {
  return typeof window !== "undefined" && window.location.pathname === "/";
}

export function completeIntro() {
  if (complete) return;
  complete = true;
  if (fallback !== undefined) window.clearTimeout(fallback);
  for (const cb of waiting) cb();
  waiting.clear();
}

/**
 * Runs `cb` once the curtain is done — immediately (next frame) if it already
 * is. Returns an unsubscribe.
 */
export function onIntroComplete(cb: () => void) {
  // No curtain on this route: release on a timer rather than a frame.
  // requestAnimationFrame is suspended entirely in a background tab, so a
  // page opened in one — and every Reveal and Stagger on it — would stay
  // hidden until the tab was focused. Timers still run there.
  if (!complete && !curtainWillPlay()) {
    const timer = window.setTimeout(cb, 0);
    return () => window.clearTimeout(timer);
  }
  if (complete) {
    const frame = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(frame);
  }
  waiting.add(cb);
  // Safety net: if the curtain is ever removed from the page, content must
  // still appear rather than stay hidden forever.
  fallback ??= window.setTimeout(completeIntro, FAILSAFE);
  return () => {
    waiting.delete(cb);
  };
}

/** React-state flavour of the same signal. */
export function useIntroComplete() {
  const [done, setDone] = useState(false);

  useEffect(() => onIntroComplete(() => setDone(true)), []);

  return done;
}
