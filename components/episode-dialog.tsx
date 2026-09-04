"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EPISODE_BLURB, EPISODE_PAGE_PATH, EPISODE_TITLE } from "@/lib/episode";
import { VideoPlayer } from "./video-player";

/**
 * The free-episode dialog, hoisted into a provider so anything on the page
 * can open it — the "see a class" card, the entry popup sequence, or any
 * future trigger — rather than each one owning its own copy of the player.
 *
 * Same shape as ContactProvider: a context exposing open(), with the dialog
 * itself rendered once at the root.
 */

type EpisodeContextValue = { open: (options?: { autoPlay?: boolean }) => void };

const EpisodeContext = createContext<EpisodeContextValue | null>(null);

/** Opens the free-episode dialog. Available inside <EpisodeProvider>. */
export function useEpisode() {
  const ctx = useContext(EpisodeContext);
  if (!ctx) throw new Error("useEpisode must be used inside <EpisodeProvider>");
  return ctx;
}

export function EpisodeProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** The player only mounts once it's been asked for — otherwise every page
   *  load pays for the video's metadata request on a dialog nobody opened. */
  const [mounted, setMounted] = useState(false);

  const open = useCallback((options?: { autoPlay?: boolean }) => {
    setMounted(true);
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    if (options?.autoPlay) {
      // Opening from a click counts as the user gesture autoplay needs, but
      // the player may not exist yet on the very first open.
      window.setTimeout(() => {
        dialog.querySelector("video")?.play().catch(() => {});
      }, 60);
    }
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  /**
   * Scroll lock and stopping playback both hang off the `open` attribute
   * rather than the dialog's `close` event: that event doesn't bubble (so
   * React's onClose never sees it) and isn't dispatched at all in some
   * engines. The attribute catches the X, the backdrop, Escape and a
   * programmatic close alike.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sync = () => {
      document.body.style.overflow = dialog.open ? "hidden" : "";
      // A video still playing behind a dismissed dialog is the worst thing a
      // popup can do.
      if (!dialog.open) dialog.querySelector("video")?.pause();
    };
    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return () => {
      observer.disconnect();
      document.body.style.overflow = "";
    };
  }, [mounted]);

  return (
    <EpisodeContext.Provider value={{ open }}>
      {children}

      <dialog
        ref={dialogRef}
        aria-label={EPISODE_TITLE}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="contact-dialog m-auto w-[min(100vw-24px,900px)] overflow-visible rounded-3xl bg-transparent p-0 backdrop:bg-neutral-90/75"
      >
        <div className="relative overflow-hidden rounded-3xl bg-neutral-90 text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            onClick={close}
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

          <div className="p-3 sm:p-4">{mounted && <VideoPlayer />}</div>

          <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="font-noi-grotesk text-[17px] leading-[1.2] font-semibold tracking-[-0.015em] sm:text-[19px]">
                {EPISODE_TITLE}
              </h2>
              <p className="max-w-md font-noi-grotesk text-[13px] leading-[1.45] tracking-[-0.01em] text-white/60">
                {EPISODE_BLURB}
              </p>
            </div>
            <Link
              href={EPISODE_PAGE_PATH}
              onClick={close}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-white/25 px-6 font-noi-grotesk text-[14px] leading-none font-semibold text-white transition duration-150 ease-in-out hover:bg-white/10"
            >
              Open full page
            </Link>
          </div>
        </div>
      </dialog>
    </EpisodeContext.Provider>
  );
}
