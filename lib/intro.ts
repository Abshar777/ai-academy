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
