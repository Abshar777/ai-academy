"use client";

import { useEffect, useState } from "react";
import { completeIntro } from "@/lib/intro";

/**
 * Intro curtain, rebuilt to match the reference frame by frame.
 *
 * The reference stacks one word per pill, reading as a sentence top to bottom.
 * All four pills start converged on a single point, spring apart into a loose
 * rotated stack, hold, then collapse back before the panel wipes upward to
 * reveal the page. Each pill is filled in the panel colour so it occludes the
 * one behind, which is what lets them overlap cleanly.
 *
 * Timings read off a screen capture of the reference:
 *   0.50s  bottom pill fades in alone
 *   0.75s  the rest sit compressed above it
 *   0.90s  the stack springs open
 *   2.10s  collapses back into one pill
 *   2.20s  panel wipes upward
 *
 * Easings are the reference's own Webflow curves — inOutQuad for the stack,
 * inOutQuart for the wipe.
 */

/** x/y are the fanned offsets from centre; the stack converges on 0,0. */
const BADGES = [
  { label: "Let's", x: -10, y: -84, rot: -9 },
  { label: "Build", x: -18, y: -36, rot: -4 },
  { label: "AI powered", x: -6, y: 14, rot: -6 },
  { label: "Applications", x: 8, y: 64, rot: 3 },
] as const;

/** Panel leaves the DOM once the wipe has finished. */
const TOTAL = 2900;
/** The wipe starts here — the page underneath begins revealing with it, not
 *  after it, so the two movements read as one. */
const REVEAL_AT = 1900;

export function Preloader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Scheduled rather than set synchronously — a sync setState here would
    // trigger a cascading render. Under reduced motion CSS hides the panel, so
    // unmounting on the next tick is enough.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timers = [
      window.setTimeout(completeIntro, reduced ? 0 : REVEAL_AT),
      window.setTimeout(() => setDone(true), reduced ? 0 : TOTAL),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  if (done) return null;

  return (
    <div className="preloader" aria-hidden>
      <div className="preloader-stack">
        {/* Hand-drawn motion arcs, as in the reference. */}
        <svg
          className="preloader-arc preloader-arc-top"
          viewBox="0 0 40 24"
          fill="none"
        >
          <path
            d="M2 20C8 6 22 2 38 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M8 22C13 11 24 8 36 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {BADGES.map((badge, i) => (
          <span
            key={badge.label}
            className="preloader-badge"
            style={{
              ["--x" as string]: `${badge.x}px`,
              ["--y" as string]: `${badge.y}px`,
              ["--rot" as string]: `${badge.rot}deg`,
              ["--i" as string]: String(i),
              zIndex: i + 1,
            }}
          >
            {badge.label}
          </span>
        ))}

        <svg
          className="preloader-arc preloader-arc-bottom"
          viewBox="0 0 40 24"
          fill="none"
        >
          <path
            d="M38 4C32 18 18 22 2 20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M32 2C27 13 16 16 4 14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
