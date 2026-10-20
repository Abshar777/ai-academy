"use client";

import { useEffect, useRef, useState } from "react";
import type { Reel } from "@/lib/reels";

/**
 * One reel: a 9:16 card that plays muted on loop while it is on screen.
 *
 * Only while it is on screen, deliberately. Half a dozen videos all decoding
 * at once is the kind of thing that is invisible on this machine and makes a
 * mid-range phone stutter through the whole page. Each card plays when it
 * scrolls into view, pauses when it leaves, and loads nothing at all until
 * then — the poster carries the card in the meantime.
 *
 * The rail renders the list twice for its seamless loop, so the id of every
 * control has to carry which copy it belongs to — two elements sharing an id
 * is invalid, and analytics would merge the two into one meaningless number.
 * Hence instanceId, handed down rather than derived here.
 *
 * Muted because it autoplays; browsers refuse autoplay with sound, and a page
 * that starts talking is worse than one that doesn't. Sound is one tap away
 * and the control says so.
 */
export function ReelCard({ reel, instanceId }: { reel: Reel; instanceId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduced.matches) {
          void video.play().catch(() => {
            // Autoplay refused (low power mode, a data saver). The poster
            // stays, and the play control is still there.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    // Unmuting is a deliberate tap, so start it if it was paused.
    if (!next) void video.play().catch(() => {});
  }

  return (
    <figure className="group relative aspect-[9/16] w-[232px] shrink-0 overflow-hidden rounded-2xl bg-neutral-90 sm:w-[260px]">
      {/* A clip that isn't vertical sits over a blurred, scaled copy of its
          own poster, so the card is still full-bleed without cropping the
          picture. The poster rather than a second <video>: two elements
          decoding the same stream to fill a background is a lot of work for
          something nobody looks at. */}
      {reel.fit === "contain" && (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
          style={{ backgroundImage: `url(${reel.poster})` }}
        />
      )}

      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={reel.caption}
        className={`relative size-full ${reel.fit === "contain" ? "object-contain" : "object-cover"}`}
      />

      {/* Reads over both a bright frame and a dark one. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent"
      />

      <button
        id={`${instanceId}-sound`}
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Unmute this reel" : "Mute this reel"}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition duration-150 ease-in-out hover:bg-black/65"
      >
        {muted ? <MutedIcon /> : <SoundIcon />}
      </button>

      {reel.href && (
        <a
          id={`${instanceId}-open`}
          href={reel.href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-end p-4 font-noi-grotesk text-[13px] leading-none font-medium tracking-[-0.015em] text-white"
        >
          <span className="inline-flex items-center gap-1.5 opacity-0 transition-opacity duration-150 ease-in-out group-hover:opacity-100 focus-visible:opacity-100">
            Watch on Instagram
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden="true">
              <path
                d="M7 17 17 7m0 0H9m8 0v8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </a>
      )}

      {/* The caption is the accessible name on the video; repeating it in
          visible text would only cover the clip. */}
      <figcaption className="sr-only">{reel.caption}</figcaption>
    </figure>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M11 5 6.5 9H3v6h3.5L11 19V5Zm5 4 4 6m0-6-4 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M11 5 6.5 9H3v6h3.5L11 19V5Zm4.5 3a5 5 0 0 1 0 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
