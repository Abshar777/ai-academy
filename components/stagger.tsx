"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useIntroComplete } from "@/lib/intro";

/**
 * Group reveal: children rise and fade in one after another when the group
 * reaches the viewport.
 *
 * A <Reveal> per child would work, but each one carries its own observer and
 * they fire independently — the order across a row ends up arbitrary. Here the
 * parent owns the single observer and Framer's staggerChildren drives the
 * order, so a grid of cards always cascades the way it reads.
 *
 * Wrap the group in <StaggerGroup> and each child in <StaggerItem>; Framer
 * resolves the "hidden"/"visible" names down the tree, so nothing has to be
 * threaded through by hand.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const GROUP: Variants = {
  hidden: {},
  visible: (custom: { stagger: number; delay: number }) => ({
    transition: {
      staggerChildren: custom.stagger,
      delayChildren: custom.delay,
    },
  }),
};

const ITEM: Variants = {
  hidden: (distance: number) => ({ opacity: 0, y: distance }),
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

type GroupProps = {
  children: ReactNode;
  className?: string;
  /** Seconds between children. */
  stagger?: number;
  /** Seconds before the first child moves. */
  delay?: number;
  as?: "div" | "ul" | "ol" | "section";
};

export function StaggerGroup({
  children,
  className,
  stagger = 0.09,
  delay = 0,
  as = "div",
}: GroupProps) {
  // Held as a plain element ref and attached by callback: the tag varies, and
  // a typed RefObject can only satisfy one of the element types at a time.
  const ref = useRef<HTMLElement | null>(null);
  // Fires a little after the top edge lands, so the cascade is visible rather
  // than half-finished by the time the group is on screen.
  const inView = useInView(ref as React.RefObject<HTMLElement>, {
    once: true,
    margin: "-10%",
  });
  const introDone = useIntroComplete();
  const Tag =
    as === "ul"
      ? motion.ul
      : as === "ol"
        ? motion.ol
        : as === "section"
          ? motion.section
          : motion.div;

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
      initial="hidden"
      animate={inView && introDone ? "visible" : "hidden"}
      variants={GROUP}
      custom={{ stagger, delay }}
    >
      {children}
    </Tag>
  );
}

type ItemProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "span";
  /** Pixels of travel. Bigger blocks read better with more. */
  distance?: number;
};

export function StaggerItem({
  children,
  className,
  as = "div",
  distance = 28,
}: ItemProps) {
  const reduced = useReducedMotion();
  const Tag = as === "li" ? motion.li : as === "span" ? motion.span : motion.div;

  return (
    <Tag className={className} variants={ITEM} custom={reduced ? 0 : distance}>
      {children}
    </Tag>
  );
}
