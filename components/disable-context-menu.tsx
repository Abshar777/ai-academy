"use client";

import { useEffect } from "react";

/**
 * Suppresses the browser's right-click menu across the site.
 *
 * Worth being clear about what this is: a deterrent against the casual "save
 * image as" or "view source", not a protection. Anything on the page is still
 * reachable through devtools, Ctrl+U, or curl, and the videos are protected by
 * signed, expiring URLs rather than by this (see academy-api/src/media).
 *
 * Text inputs keep their menu. Right-click Paste is how a great many people
 * fill in an email address or a phone number, and taking that away from the
 * checkout form would cost more than the menu is worth.
 */
export function DisableContextMenu() {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return null;
}
