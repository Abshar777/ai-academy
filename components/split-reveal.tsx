"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import {
  gsap,
  prefersReducedMotion,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { onIntroComplete } from "@/lib/intro";

/**
 * Awards-site text reveal: the copy is split into lines, each line is clipped
 * by its own mask, and the content rises up from behind it.
 *
 * Two units:
 *   "lines"  — whole lines rise together. Best for body copy and small labels.
 *   "chars"  — characters rise individually inside the line masks, so a display
 *              heading unfurls left to right. The mask still sits on the line,
 *              not the character, which keeps descenders from being clipped.
 *
 * Two triggers:
 *   "scroll" — plays once when the block reaches the lower viewport.
 *   "intro"  — held until the curtain lifts, so above-the-fold copy doesn't
 *              play its entrance while it is still hidden.
 *
 * SplitText re-splits itself when fonts finish loading or the element is
 * resized (autoSplit), which matters here because the display faces are
 * self-hosted and land after first paint. The animation is created inside
 * onSplit and returned, so GSAP re-syncs it against the new elements.
 */

type SplitRevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** What moves. Defaults to whole lines. */
  unit?: "lines" | "chars";
  /** When it plays. Defaults to on scroll. */
  start?: "scroll" | "intro";
  /** Seconds before the first unit moves. */
  delay?: number;
  /** Seconds between units. Defaults suit the unit. */
  stagger?: number;
};

export function SplitReveal({
  children,
  as: Tag = "div",
  className,
  unit = "lines",
  start = "scroll",
  delay = 0,
  stagger,
}: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      // Nothing to split against — leave the markup untouched.
      if (prefersReducedMotion()) return;

      const step = stagger ?? (unit === "chars" ? 0.022 : 0.09);
      let release: (() => void) | undefined;

      const split = SplitText.create(el, {
        // Lines are always needed: they carry the mask, even when characters
        // are what actually moves.
        type: unit === "chars" ? "lines,words,chars" : "lines",
        mask: "lines",
        autoSplit: true,
        aria: "auto",
        linesClass: "split-line",
        onSplit(self) {
          const targets = unit === "chars" ? self.chars : self.lines;

          const tween = gsap.from(targets, {
            yPercent: 115,
            // A touch of rotation stops the rise from reading as a flat slide.
            rotate: unit === "chars" ? 0 : 2,
            duration: unit === "chars" ? 0.95 : 1.1,
            ease: "expo.out",
            stagger: step,
            delay,
            paused: start === "intro",
            scrollTrigger:
              start === "scroll"
                ? { trigger: el, start: "top 85%", once: true }
                : undefined,
          });

          if (start === "intro") {
            release?.();
            release = onIntroComplete(() => tween.play());
          }

          return tween;
        },
      });

      return () => {
        release?.();
        split.revert();
      };
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
