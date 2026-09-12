"use client";

import { useEffect, useRef, useState } from "react";
import { SeminarForm } from "./seminar-form";
import type { WebinarSession } from "@/lib/next-webinar";

/**
 * The booking form, brought to the front on a phone a second after the page
 * settles.
 *
 * Phones only, and for a layout reason rather than a marketing one: the page
 * puts the poster and the form side by side from `lg` up, so on a desktop the
 * form is already in view and a dialog would only cover it. Below that they
 * stack, and the form sits under a full-height poster — off screen, on the one
 * page whose entire purpose is that form.
 *
 * A second, not immediately: appearing mid-paint reads as an error, and the
 * poster is what convinces somebody to book, so it should be seen first.
 *
 * Closing is final for this visit. The form it was covering is still on the
 * page, directly below, so there is nothing left to recover — re-opening would
 * be nagging somebody towards a form they have already scrolled to.
 */
const APPEAR_AFTER_MS = 1000;
/** Tailwind's `lg`, where the page stops stacking. */
const STACKS_BELOW_PX = 1024;

export function SeminarPrompt({ session }: { session: WebinarSession | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mobile, setMobile] = useState(false);

  // Deferred a tick rather than set straight away: a setState the effect body
  // reaches synchronously cascades a render, which the lint rule flags — and
  // reading a media query during render would disagree with the server HTML
  // this hydrates into.
  useEffect(() => {
    if (!session) return;
    if (!window.matchMedia(`(max-width: ${STACKS_BELOW_PX - 1}px)`).matches) return;
    const id = window.setTimeout(() => setMobile(true), 0);
    return () => window.clearTimeout(id);
  }, [session]);

  // Separate, so the dialog is mounted by the time this opens it.
  useEffect(() => {
    if (!mobile) return;
    const id = window.setTimeout(() => {
      // Guarded: showModal throws on an already-open dialog, and the page can
      // be navigated away from inside the delay.
      if (ref.current && !ref.current.open) ref.current.showModal();
    }, APPEAR_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [mobile]);

  if (!mobile || !session) return null;

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-label="Book your free seat"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="contact-dialog m-auto w-[min(100vw-32px,420px)] overflow-visible rounded-3xl bg-transparent p-0 backdrop:bg-neutral-90/70"
    >
      <div className="relative">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 flex size-9 items-center justify-center rounded-full bg-neutral-90 text-white shadow-lg transition-colors duration-150 hover:bg-neutral-70"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <SeminarForm session={session} compact />
      </div>
    </dialog>
  );
}
