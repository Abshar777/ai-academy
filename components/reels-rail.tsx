"use client";

import { useEffect, useRef } from "react";
import { ReelCard } from "./reel-card";
import type { Reel } from "@/lib/reels";

/**
 * The reels row: drifts along on its own, and stops the moment anyone takes
 * hold of it.
 *
 * The drift is a real scroll — scrollLeft nudged a fraction of a pixel per
 * frame — rather than a CSS transform. That keeps the rail an ordinary
 * scroll container, so a trackpad swipe, a touch drag, a wheel and the
 * keyboard all still work with no code of their own, and whatever position
 * the visitor leaves it at is simply where the drift picks up again.
 *
 * The list is rendered twice. When the scroll passes the halfway mark it is
 * wound back by exactly half the width, which lands on the identical frame
 * of the second copy — so it runs forever with no jump to see, and no rewind
 * to the start. The cost is six more <video> nodes, which is close to free:
 * they preload nothing and only play while on screen, and the copy is never
 * on screen at the same time as its original.
 *
 * No scroll snapping. Snap points fight a programmatic scroll — each frame's
 * nudge gets pulled back to the nearest card, and the rail judders in place
 * instead of moving.
 */

/** Pixels per frame. Slow enough to read a card, fast enough to notice. */
const SPEED = 0.45;

export function ReelsRail({ reels }: { reels: Reel[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  /** Set while a pointer is over the rail or something in it has focus. */
  const held = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    function step() {
      const rail = railRef.current;
      if (!rail) return;
      if (!held.current) {
        // Half the scroll width is one full copy of the list.
        const half = rail.scrollWidth / 2;
        const next = rail.scrollLeft + SPEED;
        rail.scrollLeft = next >= half ? next - half : next;
      }
      frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  const hold = () => {
    held.current = true;
  };
  const release = () => {
    held.current = false;
  };

  return (
    <ul
      ref={railRef}
      onPointerEnter={hold}
      onPointerLeave={release}
      onPointerDown={hold}
      onPointerUp={release}
      onFocusCapture={hold}
      onBlurCapture={release}
      // no-scrollbar: the rail scrolls itself, and a bar sitting under the
      // cards only says "this is a scroll container", which the motion has
      // already said.
      className="no-scrollbar flex w-full gap-3 overflow-x-auto px-6 pb-2 sm:gap-4"
    >
      {/* Two copies. The second is decoration as far as a screen reader is
          concerned — the same six clips, announced once. */}
      {[0, 1].map((copy) =>
        reels.map((reel, index) => (
          <li key={`${reel.src}-${copy}`} aria-hidden={copy === 1 ? true : undefined}>
            <ReelCard reel={reel} instanceId={`reel-${index + 1}-copy-${copy + 1}`} />
          </li>
        )),
      )}
    </ul>
  );
}
