"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The player for the marketing film.
 *
 * Deliberately not components/video-player.tsx. That one is 700 lines of
 * language toggle, watermarking, download discouragement and progress
 * reporting, all of it there because the course is paid. None of it applies
 * to a thirty-second advert anybody may watch, and sharing the component
 * would mean every change made for the course has to be checked against the
 * front page. What they share is transport controls, which is the cheap part.
 *
 * On autoplay with sound: no browser allows it cold. Chrome, Safari and
 * Firefox all reject play() on an unmuted video until the visitor has
 * interacted with the page, or — in Chrome — has enough history with the
 * domain. Relying on it does not get a quiet video, it gets a stopped one.
 * So this asks for sound, and takes muted as the answer when it must: the
 * unmuted attempt goes first, and on rejection the film starts muted with a
 * control offering sound in one tap. Returning visitors often get it as
 * intended; everyone else gets moving picture and the choice.
 *
 * It loops. Thirty seconds is short enough that someone arriving mid-way
 * sees the whole thing round again rather than a frozen last frame.
 */

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function format(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type FullscreenCapable = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export function AdPlayer({
  src,
  poster,
  label,
  idPrefix,
  startMuted = false,
  className = "",
}: {
  src: string;
  poster: string;
  /** Prefixes every control's id. The player appears on more than one page
   *  and the two are worth counting separately. */
  idPrefix: string;
  /** Accessible name for the video itself. */
  label: string;
  /**
   * Start silent and don't even ask for sound. For the copy on /order, which
   * sits beside the form: a video that starts talking at someone filling in
   * their card details is a reason to close the tab.
   */
  startMuted?: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const started = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(startMuted);
  const [needsSound, setNeedsSound] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  /** True while the thumb is being dragged. */
  const [scrubbing, setScrubbing] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  /** Any pointer or key activity re-shows the bar and restarts its timer. */
  const wakeChrome = useCallback(() => {
    setChromeVisible(true);
    window.clearTimeout(hideTimer.current);
    // Never hide while paused or while the speed menu is open — a control
    // that vanishes under the cursor is worse than one that stays.
    if (!videoRef.current?.paused && !speedOpen) {
      hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2600);
    }
  }, [speedOpen]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  /**
   * Take the duration from the element as well as from the event.
   *
   * With preload="metadata" the file's header is often already in by the
   * time React hydrates, so loadedmetadata has fired into a component that
   * was not listening yet and never fires again. The scrub bar was left with
   * max="0" — a slider with no range, which neither fills nor drags.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const read = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };
    read();
    video.addEventListener("loadedmetadata", read);
    video.addEventListener("durationchange", read);
    return () => {
      video.removeEventListener("loadedmetadata", read);
      video.removeEventListener("durationchange", read);
    };
  }, []);

  // Start when it scrolls into view, pause when it leaves. A film talking to
  // the ceiling while someone reads further down the page is worse than one
  // that waited for them.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    async function begin() {
      const video = videoRef.current;
      if (!video) return;
      started.current = true;
      if (startMuted) {
        video.muted = true;
        setMuted(true);
        setNeedsSound(true);
        await video.play().catch(() => {});
        return;
      }
      try {
        video.muted = false;
        await video.play();
        setMuted(false);
        setNeedsSound(false);
      } catch {
        video.muted = true;
        setMuted(true);
        setNeedsSound(true);
        try {
          await video.play();
        } catch {
          // Refused even muted — a data saver or low power mode. The poster
          // and the play button are still there.
        }
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduced.matches) {
          if (!started.current) void begin();
          else void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [startMuted]);

  // Fullscreen can also be left with Escape or the system control, so the
  // button's own state is not the source of truth.
  useEffect(() => {
    const doc = document as FullscreenDoc;
    const sync = () =>
      setFullscreen(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  /**
   * When the browser refused sound, take it at the visitor's first gesture.
   *
   * Autoplay policy blocks an unmuted play() until the page has been
   * interacted with — but the moment it has been, by any click, key or tap
   * anywhere on the page, the block lifts. Without this the film stays
   * silent until someone notices the small control in the corner, which for
   * most visitors means never, and "plays with sound" is true only on paper.
   *
   * Only while the film is on screen and actually running. Unmuting one the
   * visitor has already scrolled past, because they clicked something else
   * entirely, is a noise coming from nowhere.
   *
   * Never for a startMuted player — /order is meant to stay quiet.
   */
  useEffect(() => {
    if (startMuted || !needsSound) return;

    function take() {
      const video = videoRef.current;
      if (!video || video.paused) return;
      const box = video.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight) return;
      video.muted = false;
      setMuted(false);
      setNeedsSound(false);
    }

    const opts = { once: true, passive: true } as const;
    document.addEventListener("pointerdown", take, opts);
    document.addEventListener("keydown", take, opts);
    document.addEventListener("touchstart", take, opts);
    return () => {
      document.removeEventListener("pointerdown", take);
      document.removeEventListener("keydown", take);
      document.removeEventListener("touchstart", take);
    };
  }, [startMuted, needsSound]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    // A click is the gesture every browser accepts, so this always sticks.
    if (!video.muted) setNeedsSound(false);
  }

  function pickSpeed(rate: number) {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
    setSpeed(rate);
    setSpeedOpen(false);
  }

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const to = Number(event.target.value);
    video.currentTime = to;
    setCurrent(to);
  }

  async function toggleFullscreen() {
    const doc = document as FullscreenDoc;
    const wrap = wrapRef.current as FullscreenCapable | null;
    if (!wrap) return;
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      return;
    }
    await (wrap.requestFullscreen?.() ?? wrap.webkitRequestFullscreen?.());
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      onMouseMove={wakeChrome}
      onMouseLeave={() => !videoRef.current?.paused && !speedOpen && setChromeVisible(false)}
      className={`group relative overflow-hidden rounded-2xl bg-neutral-90 sm:rounded-3xl ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        // Silent from the first frame, not from whenever the observer gets
        // round to it. Without this the element is unmuted until JS runs,
        // which on /order is a window where the film can be heard.
        muted={startMuted}
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onClick={() => {
          togglePlay();
          wakeChrome();
        }}
        onPlay={() => {
          setPlaying(true);
          wakeChrome();
        }}
        onPause={() => {
          setPlaying(false);
          setChromeVisible(true);
        }}
        onTimeUpdate={(e) => {
          // Ignored mid-drag, or each frame would yank the thumb back under
          // the cursor to wherever playback had got to.
          if (!scrubbing) setCurrent(e.currentTarget.currentTime);
        }}
        className="block aspect-video w-full cursor-pointer"
      />

      {/* Centre play button, only while stopped. During playback the bar is
          enough, and a disc over the middle of the picture is in the way. */}
      {!playing && (
        <button
          id={`${idPrefix}-play-overlay`}
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition duration-150 ease-in-out hover:scale-105 hover:bg-black/70 sm:size-20">
            <PlayIcon className="ml-1 size-7 sm:size-9" />
          </span>
        </button>
      )}

      {needsSound && (
        <button
          id={`${idPrefix}-tap-for-sound`}
          type="button"
          onClick={toggleMute}
          className="absolute top-3 right-3 inline-flex h-9 items-center gap-2 rounded-full bg-black/55 pr-4 pl-3 font-noi-grotesk text-[13px] leading-none font-medium text-white backdrop-blur-sm transition duration-150 ease-in-out hover:bg-black/75 sm:top-4 sm:right-4"
        >
          <MutedIcon className="size-4" />
          Tap for sound
        </button>
      )}

      <div
        className={
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pt-10 pb-3 transition-opacity duration-200 ease-in-out sm:px-4 sm:pb-4 " +
          (chromeVisible ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={current}
          onChange={seek}
          onPointerDown={() => setScrubbing(true)}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          onKeyDown={wakeChrome}
          disabled={duration === 0}
          id={`${idPrefix}-seek`}
          aria-label="Seek"
          className="ad-scrub w-full cursor-pointer outline-none"
          style={{ "--progress": `${progress}%` } as React.CSSProperties}
        />

        <div className="mt-2.5 flex items-center gap-3 text-white">
          <button
            id={`${idPrefix}-playpause`}
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
          </button>

          <button
            id={`${idPrefix}-mute`}
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MutedIcon className="size-5" /> : <SoundIcon className="size-5" />}
          </button>

          <span className="font-noi-grotesk text-[12px] leading-none tabular-nums text-white/80">
            {format(current)} / {format(duration)}
          </span>

          <div className="relative ml-auto">
            <button
              id={`${idPrefix}-speed`}
              type="button"
              onClick={() => setSpeedOpen((open) => !open)}
              aria-label="Playback speed"
              aria-expanded={speedOpen}
              className="inline-flex h-7 items-center rounded-full border border-white/25 px-2.5 font-noi-grotesk text-[12px] leading-none font-medium tabular-nums transition-colors duration-150 hover:border-white/60"
            >
              {speed}×
            </button>

            {speedOpen && (
              <ul className="absolute right-0 bottom-9 overflow-hidden rounded-xl border border-white/10 bg-neutral-90/95 backdrop-blur-md">
                {SPEEDS.map((rate) => (
                  <li key={rate}>
                    <button
                      id={`${idPrefix}-speed-${String(rate).replace(".", "-")}`}
                      type="button"
                      onClick={() => pickSpeed(rate)}
                      className={
                        "block w-full px-4 py-2 text-left font-noi-grotesk text-[13px] leading-none tabular-nums transition-colors duration-150 hover:bg-white/10 " +
                        (rate === speed ? "text-lime-30" : "text-white/80")
                      }
                    >
                      {rate}×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            id={`${idPrefix}-fullscreen`}
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            <FullscreenIcon className="size-5" active={fullscreen} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function PauseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
    </svg>
  );
}

function SoundIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
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

function MutedIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
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

function FullscreenIcon({ className = "size-5", active }: { className?: string; active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d={
          active
            ? "M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5"
            : "M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5"
        }
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
