"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP.
 *
 * Plugins must be registered once, before first use — doing it inside a
 * component would re-run on every render. Every client component that needs
 * GSAP imports from here rather than from "gsap" directly, so the registration
 * is guaranteed to have happened.
 *
 * The module is client-only: importing it from a server component would run
 * plugin registration during SSR, where there is no DOM.
 */
gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export { gsap, useGSAP, SplitText, ScrollTrigger };

/** True when the visitor has asked for reduced motion. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
