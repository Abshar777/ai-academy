"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSessionHint } from "@/lib/use-session-hint";
import { EPISODE_PAGE_PATH } from "@/lib/episode";
import { WEBINAR_BOOKING_URL, formatWebinarDate, nextWebinarDate } from "@/lib/next-webinar";
import { useEpisode } from "./episode-dialog";

/**
 * The two entry popups, in order: the free seminar first, then the free
 * episode once that one is out of the way.
 *
 * Both are native <dialog>s opened with showModal(), which is what the
 * enquiry dialog uses — it gives focus trapping and Escape for free.
 *
 * Nothing is persisted: every page load runs the sequence again, so a
 * returning visitor sees it every time. They are suppressed on the routes
 * where an interruption would be in the way (checkout, the watch page itself,
 * admin, the course), and for anyone with a session — offering a free taster
 * to someone who already bought the programme reads as not knowing who they
 * are.
 */

const FIRST_POPUP_DELAY_MS = 3000;

/**
 * The seminar popup is paused. Set back to true to bring it and its poster
 * back — everything it needs is still here, nothing was deleted.
 *
 * While it is off, the free-episode popup takes its slot directly rather than
 * waiting to be handed the baton, which is what used to open it.
 */
const SEMINAR_POPUP_ENABLED = false;

/** Routes where an interrupting dialog is the wrong call. */
function isSuppressed(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/order") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith(EPISODE_PAGE_PATH) ||
    pathname.startsWith("/learn")
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-neutral-90/60 text-white backdrop-blur-md transition-colors duration-150 hover:bg-neutral-90/80"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
        <path
          d="M3 3l10 10M13 3 3 13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export function SitePopups() {
  const pathname = usePathname();

  const hasSession = useSessionHint();

  const suppressed = isSuppressed(pathname) || hasSession;
  const episode = useEpisode();
  const seminarRef = useRef<HTMLDialogElement>(null);
  const [webinarDate, setWebinarDate] = useState("");
  /** Guards the hand-off so closing the episode dialog can't reopen anything. */
  const stage = useRef<"idle" | "seminar" | "episode" | "done">("idle");

  const close = useCallback((ref: React.RefObject<HTMLDialogElement | null>) => {
    ref.current?.close();
  }, []);

  // Kicks off on every visit — nothing is remembered between page loads, by
  // design. The `stage` ref is the only guard, and it lives for the life of
  // this mount, so moving between routes client-side doesn't re-trigger it;
  // a fresh load starts the sequence again.
  useEffect(() => {
    if (suppressed || stage.current !== "idle") return;

    const timer = window.setTimeout(() => {
      // With the seminar paused there is no dialog to close, so nothing would
      // ever hand the episode popup its cue — it opens on the same delay
      // instead.
      if (!SEMINAR_POPUP_ENABLED) {
        stage.current = "done";
        episode.open();
        return;
      }

      const next = nextWebinarDate();
      if (next) setWebinarDate(formatWebinarDate(next));
      stage.current = "seminar";
      seminarRef.current?.showModal();
    }, FIRST_POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [suppressed, episode]);

  /**
   * Both the scroll lock and the seminar -> episode hand-off run off the
   * `open` attribute rather than the dialog's `close` event.
   *
   * `close` is the obvious hook and it is what the enquiry dialog would
   * suggest, but it doesn't bubble — so React's onClose prop never sees it —
   * and it isn't dispatched at all in some engines. Watching the attribute
   * instead catches every close path there is: the X, the backdrop, Escape,
   * and a programmatic close().
   */
  useEffect(() => {
    const seminar = seminarRef.current;
    if (!seminar) return;

    const sync = () => {
      document.body.style.overflow = seminar.open ? "hidden" : "";

      if (!seminar.open && stage.current === "seminar") {
        stage.current = "done";
        // A beat, so the seminar has finished closing before the episode
        // opens — stacking showModal() calls in one frame leaves the
        // backdrop stuck on. No autoplay: this one arrives uninvited, so it
        // waits to be pressed.
        window.setTimeout(() => episode.open(), 260);
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(seminar, { attributes: true, attributeFilter: ["open"] });

    return () => {
      observer.disconnect();
      document.body.style.overflow = "";
    };
    // Re-attaches when the route stops/starts suppressing: the dialog
    // unmounts on those routes, and an observer left pointing at the
    // detached node would silently stop driving the hand-off on the way back.
  }, [suppressed, episode]);

  // Paused rather than removed: the markup below is what comes back when
  // SEMINAR_POPUP_ENABLED goes true again.
  if (suppressed || !SEMINAR_POPUP_ENABLED) return null;

  return (
    <>
      <dialog
        ref={seminarRef}
        aria-label="Free webinar"
        onClick={(e) => {
          if (e.target === e.currentTarget) close(seminarRef);
        }}
        className="contact-dialog m-auto w-[min(100vw-32px,420px)] overflow-visible rounded-3xl bg-transparent p-0 backdrop:bg-neutral-90/70"
      >
        <div className="relative overflow-hidden rounded-3xl bg-neutral-90 text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
          <CloseButton onClick={() => close(seminarRef)} />

          <Image
            src="/seminar/webinar-poster.jpg"
            alt="Free webinar — Prompt. Build. Launch. Saturday 5 September, with Muhammed Shan"
            width={1080}
            height={1350}
            className="h-auto w-full"
            priority={false}
          />

          <div className="flex flex-col gap-3 p-5">
            <a
              href={WEBINAR_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close(seminarRef)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-lime-30 px-6 font-noi-grotesk text-[15px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 active:scale-[0.98]"
            >
              Book your free slot
            </a>
            <button
              type="button"
              onClick={() => close(seminarRef)}
              className="font-noi-grotesk text-[13px] leading-none text-white/55 transition-colors duration-150 hover:text-white"
            >
              {webinarDate ? `Maybe later — next one is ${webinarDate}` : "Maybe later"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
