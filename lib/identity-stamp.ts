"use client";

/**
 * Tracks whether something on screen is already stamping the viewer's identity.
 *
 * Two watermarks exist on the course pages: the player draws one over the video
 * frame, and CourseWatermark draws one across the whole page. Both carry the
 * same email and phone, so on an episode page they showed up together — one on
 * the video, one floating over the page beside it, which reads as a bug rather
 * than as security.
 *
 * The rule is one stamp on screen at a time, and the more specific one wins:
 * a player that marks its own frame says so here, and the page-wide mark steps
 * aside for as long as it is mounted. Nothing goes unstamped either way.
 */

import { useEffect, useSyncExternalStore } from "react";

let stamping = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of [...listeners]) listener();
}

/** Declares that this component stamps the viewer's identity itself while
 *  `active` — the page-wide watermark stays out of its way meanwhile. */
export function useIdentityStamp(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    stamping += 1;
    emit();
    return () => {
      stamping -= 1;
      emit();
    };
  }, [active]);
}

/** True while anything on the page is stamping the viewer's identity itself.
 *  False on the server, so the page-wide mark renders and then yields — it is
 *  signed-in-only and client-rendered anyway. */
export function useStampedElsewhere(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => stamping > 0,
    () => false,
  );
}
