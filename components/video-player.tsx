"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EPISODE_LANGUAGES,
  EPISODE_SOURCES,
  type EpisodeLanguage,
} from "@/lib/episode";

/**
 * The episode player. Deliberately not the browser's native controls: those
 * look different in every browser, can't carry the language switch, and drop
 * a download button on the file. Everything here is ours —
 * play/scrub/volume/fullscreen plus the ML/EN toggle — with the chrome fading
 * out while the video plays and coming back on any pointer or key input.
 *
 * Switching language keeps your place: the position and play state are
 * captured before the source swaps and restored once the new file reports
 * its metadata.
 */

const HIDE_CONTROLS_AFTER_MS = 2600;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function PlayIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1l-10.6-6.8a.6.6 0 0 0-.92.5Z" />
    </svg>
  );
}

function PauseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7 4.5h3.2v15H7zM13.8 4.5H17v15h-3.2z" />
    </svg>
  );
}

function VolumeIcon({ muted, className = "size-5" }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4a.8.8 0 0 1-.8-.8v-3.4a.8.8 0 0 1 .8-.8Z"
        fill="currentColor"
      />
      {muted ? (
        <path
          d="m16 9.5 4.5 4.5M20.5 9.5 16 14"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M15.6 9.2a4 4 0 0 1 0 5.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M18.2 6.8a7.5 7.5 0 0 1 0 10.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function FullscreenIcon({ active, className = "size-5" }: { active: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d={
          active
            ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
            : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoPlayer({
  initialLanguage = "en",
  className = "",
  autoPlay = false,
}: {
  initialLanguage?: EpisodeLanguage;
  className?: string;
  autoPlay?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  /** Position/play state carried across a language swap. */
  const resumeAt = useRef<{ time: number; playing: boolean } | null>(null);

  const [language, setLanguage] = useState<EpisodeLanguage>(initialLanguage);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    window.clearTimeout(hideTimer.current);
    // Only auto-hide while it's actually playing — a paused player keeps its
    // controls up, which is what people expect when they've stopped to read.
    if (videoRef.current && !videoRef.current.paused) {
      hideTimer.current = window.setTimeout(() => setChromeVisible(false), HIDE_CONTROLS_AFTER_MS);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(seconds, 0), video.duration);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrap.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Swap source, keeping the viewer's place.
  function changeLanguage(next: EpisodeLanguage) {
    const video = videoRef.current;
    if (!video || next === language) return;
    resumeAt.current = { time: video.currentTime, playing: !video.paused };
    setLanguage(next);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
  }, [language]);

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    const resume = resumeAt.current;
    if (resume) {
      video.currentTime = Math.min(resume.time, video.duration || resume.time);
      if (resume.playing) video.play().catch(() => {});
      resumeAt.current = null;
    }
  };

  const onProgress = () => {
    const video = videoRef.current;
    if (!video || video.buffered.length === 0) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
  };

  // Scrubbing — pointer events so mouse, touch and pen all work, with capture
  // so a drag that leaves the track keeps controlling it.
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const video = videoRef.current;
      if (!track || !video || !Number.isFinite(video.duration)) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      const time = ratio * video.duration;
      setCurrent(time);
      video.currentTime = time;
    },
    [],
  );

  function onTrackPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    scrubbing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event.clientX);
  }

  function onTrackPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing.current) return;
    seekFromPointer(event.clientX);
  }

  function onTrackPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    scrubbing.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  // Keyboard, scoped to the player so it can't hijack the page.
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video) return;
    const key = event.key.toLowerCase();
    const handled = [" ", "k", "arrowleft", "arrowright", "arrowup", "arrowdown", "m", "f"];
    if (!handled.includes(key)) return;
    event.preventDefault();
    showChrome();

    if (key === " " || key === "k") togglePlay();
    else if (key === "arrowleft") seekTo(video.currentTime - 5);
    else if (key === "arrowright") seekTo(video.currentTime + 5);
    else if (key === "arrowup") video.volume = Math.min(video.volume + 0.1, 1);
    else if (key === "arrowdown") video.volume = Math.max(video.volume - 0.1, 0);
    else if (key === "m") video.muted = !video.muted;
    else if (key === "f") toggleFullscreen();
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const chromeShown = chromeVisible || !playing;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={showChrome}
      onPointerLeave={() => playing && setChromeVisible(false)}
      className={`group relative aspect-video w-full overflow-hidden rounded-2xl bg-black outline-none select-none focus-visible:ring-2 focus-visible:ring-lime-30 ${className}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onProgress={onProgress}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          showChrome();
        }}
        onPause={() => {
          setPlaying(false);
          setChromeVisible(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setChromeVisible(true);
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
      >
        <source src={EPISODE_SOURCES[language]} type="video/mp4" />
      </video>

      {/* Centre affordance — the whole point of the first frame. */}
      {(!started || !playing) && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-200"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-lime-30 text-neutral-90 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:scale-105 sm:size-20">
            <PlayIcon className="ml-0.5 size-7 sm:size-8" />
          </span>
        </button>
      )}

      {waiting && started && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-lime-30" />
      )}

      {/* Language switch, top-right so it never sits under the scrub bar. */}
      <div
        className={`absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 p-1 backdrop-blur-md transition-opacity duration-300 sm:top-4 sm:right-4 ${
          chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {EPISODE_LANGUAGES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => changeLanguage(option.id)}
            aria-pressed={language === option.id}
            title={option.label}
            className={`rounded-full px-3 py-1 font-noi-grotesk text-[12px] leading-none font-semibold tracking-[0.04em] transition-colors duration-150 ${
              language === option.id
                ? "bg-lime-30 text-neutral-90"
                : "text-white/70 hover:text-white"
            }`}
          >
            {option.short}
          </button>
        ))}
      </div>

      {/* Control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-10 pb-3 transition-opacity duration-300 sm:px-4 sm:pb-4 ${
          chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          ref={trackRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(current) || 0}
          tabIndex={-1}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          className="group/track relative flex h-4 w-full cursor-pointer items-center"
        >
          <span className="absolute inset-x-0 h-1 rounded-full bg-white/25 transition-[height] duration-150 group-hover/track:h-1.5" />
          <span
            className="absolute h-1 rounded-full bg-white/35 transition-[height] duration-150 group-hover/track:h-1.5"
            style={{ width: `${bufferedPct}%` }}
          />
          <span
            className="absolute h-1 rounded-full bg-lime-30 transition-[height] duration-150 group-hover/track:h-1.5"
            style={{ width: `${progress}%` }}
          />
          <span
            className="absolute size-3 rounded-full bg-lime-30 opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-opacity duration-150 group-hover/track:opacity-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="mt-1.5 flex items-center gap-3 text-white sm:gap-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="shrink-0 transition-opacity duration-150 hover:opacity-80"
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Volume: the slider only takes up room where there's a pointer to
              use it — on touch the mute toggle is the whole control. */}
          <div className="group/vol hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (video) video.muted = !video.muted;
              }}
              aria-label={muted ? "Unmute" : "Mute"}
              className="shrink-0 transition-opacity duration-150 hover:opacity-80"
            >
              <VolumeIcon muted={muted || volume === 0} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const video = videoRef.current;
                if (!video) return;
                video.volume = Number(e.target.value);
                video.muted = Number(e.target.value) === 0;
              }}
              aria-label="Volume"
              className="video-volume h-1 w-0 cursor-pointer opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100"
            />
          </div>

          <span className="font-noi-grotesk text-[12px] leading-none tabular-nums text-white/80 sm:text-[13px]">
            {formatTime(current)} <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            className="ml-auto shrink-0 transition-opacity duration-150 hover:opacity-80"
          >
            <FullscreenIcon active={fullscreen} />
          </button>
        </div>
      </div>
    </div>
  );
}
