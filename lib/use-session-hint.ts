"use client";

import { useEffect, useState } from "react";
import { hasSessionHint } from "./academy-api";

/**
 * Whether this browser looks signed in, from the readable cookie the course
 * API sets beside its httpOnly one.
 *
 * Used to decide what a customer shouldn't be shown — the launch-price bar,
 * the enrol bar, the enrolment toasts, the free-class popup. Every one of
 * those is written at somebody deciding whether to buy, and shown to someone
 * who already has, they read as not knowing who they are.
 *
 * Deliberately the cookie rather than the session context: it answers
 * synchronously with no request, so a visitor who has never signed in costs
 * nothing on page load. It is advisory only — forging it hides some marketing,
 * nothing more, and access itself is checked server-side.
 *
 * Starts false so the server-rendered markup and its first client render
 * agree; the real answer arrives a tick after mount.
 */
export function useSessionHint(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // Deferred a tick — the lint rule flags a setState the effect body can
    // reach synchronously, and reading a cookie during render would disagree
    // with the HTML it hydrates into.
    const id = window.setTimeout(() => setSignedIn(hasSessionHint()), 0);
    return () => window.clearTimeout(id);
  }, []);

  return signedIn;
}
