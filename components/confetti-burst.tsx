"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

/** Brand lime + near-black + white, matching the rest of the site's palette. */
const COLORS = ["#d3fb52", "#171717", "#ffffff"];

/**
 * Fires once on mount — used solely on the post-payment thank-you page, so
 * "once per page load" is exactly right; it should never replay on its own.
 */
export function ConfettiBurst() {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 }, colors: COLORS });

    const end = Date.now() + 1800;
    let frameId: number;
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 60, origin: { x: 0 }, colors: COLORS });
      confetti({ particleCount: 3, angle: 120, spread: 60, origin: { x: 1 }, colors: COLORS });
      if (Date.now() < end) frameId = requestAnimationFrame(frame);
    })();

    return () => cancelAnimationFrame(frameId);
  }, []);

  return null;
}
