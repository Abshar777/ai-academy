"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { useIntroComplete } from "@/lib/intro";

/**
 * Fade + slide-up on first entry into view.
 *
 * The travel distance comes from a `--translateY-from` custom property on the
 * element itself, so callers set it per-breakpoint with a utility class
 * (`[--translateY-from:20%] lg:[--translateY-from:40%]`). It's a percentage of
 * the element's own height, so tall blocks travel further than short ones.
 *
 * Blocks also wait for the intro curtain. Without that, anything above the
 * fold counts as in-view on mount and finishes animating while it is still
 * hidden — the page would be revealed already settled.
 *
 * Honours `prefers-reduced-motion` by dropping the travel and keeping the fade.
 */

const SPRING: Transition = {
  type: "spring",
  stiffness: 80,
  damping: 20,
  mass: 1,
};

// Kept module-level: creating these during render would remount on every pass.
const TAGS = {
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  p: motion.p,
  span: motion.span,
  section: motion.section,
} as const;

type RevealProps = {
  children: ReactNode;
  /** Rendered element. Defaults to a div. */
  as?: keyof typeof TAGS;
  className?: string;
  /** Seconds to wait once the block is in view. */
  delay?: number;
  /** Lifts slightly under the pointer. For cards and other tappable blocks. */
  hover?: boolean;
};

export function Reveal({
  children,
  as = "div",
  className,
  delay = 0,
  hover = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // The margin lets a block start moving slightly before its edge lands.
  const inView = useInView(ref, { once: true, margin: "20%" });
  const introDone = useIntroComplete();
  const reduceMotion = useReducedMotion();
  const Tag = TAGS[as];

  return (
    <Tag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView && introDone ? "visible" : "hidden"}
      whileHover={hover && !reduceMotion ? { y: -6 } : undefined}
      variants={{
        hidden: {
          opacity: 0,
          translateY: reduceMotion ? 0 : "var(--translateY-from)",
        },
        visible: {
          opacity: 1,
          translateY: 0,
          transition: { ...SPRING, delay },
        },
      }}
    >
      {children}
    </Tag>
  );
}
