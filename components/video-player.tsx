"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import {
  EPISODE_LANGUAGES,
  EPISODE_SOURCES,
  type EpisodeLanguage,
} from "@/lib/episode";
import { useIdentityStamp } from "@/lib/identity-stamp";

/**
 * The episode player. Deliberately not the browser's native controls: those
 * look different in every browser, can't carry the language switch, and drop
 * a download button on the file. Everything here is ours —
 * play/scrub/volume/fullscreen, the ML/EN toggle, playback speed, and
 * pinch-to-zoom with pan — with the chrome fading out while the video plays
 * and coming back on any pointer or key input.
 *
 * Switching language keeps your place: the position and play state are
 * captured before the source swaps and restored once the new file reports
 * its metadata. Speed survives the same swap; the element resets
 * playbackRate on load, so it is re-applied from a ref.
 */

const HIDE_CONTROLS_AFTER_MS = 2600;

/** Steps for the speed control, slowest first. Stepping walks this list, so
 *  the gaps are the increments — fine-grained around 1×, where a class is
 *  actually watched, and coarser at the ends. */
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const MIN_ZOOM = 1;
/** Past about 4× a 1080p class video is showing its own pixels, so more
 *  magnification buys nothing but blur. */
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
/** How far a press has to travel before it counts as a drag rather than a
 *  tap. Below this a shaky finger on a phone would pan the picture instead
 *  of pausing. */
const DRAG_SLOP = 6;

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

/** "1×", "1.25×", "2.4×" — no trailing zero, which would read as precision
 *  the number doesn't have. */
function formatRate(value: number): string {
  return `${Number.parseFloat(value.toFixed(2))}×`;
}

/**
 * Keeps the picture covering the frame. Panning further than this would
 * show background where the video should be, and on a zoomed-in phone it is
 * easy to flick the whole picture off the screen and not understand why it
 * has gone blank.
 *
 * Measured against the element box rather than the picture inside it. The
 * video is object-contain, so a clip whose aspect doesn't match 16:9 carries
 * letterbox bars, and those bars are included in the travel — the practical
 * effect is a little slack at the extremes of the short axis, which is a far
 * better failure than clamping the picture itself out of reach.
 */
function clampPan(
  pan: { x: number; y: number },
  zoom: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const maxX = ((zoom - 1) * width) / 2;
  const maxY = ((zoom - 1) * height) / 2;
  return {
    x: Math.min(Math.max(pan.x, -maxX), maxX),
    y: Math.min(Math.max(pan.y, -maxY), maxY),
  };
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

/** A magnifier, plus or minus. Marks the zoom cluster as zoom rather than
 *  leaving two bare steppers side by side with the speed one. */
function ZoomIcon({ out = false, className = "size-5" }: { out?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.4 15.4 4.4 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d={out ? "M7.6 10.5h5.8" : "M7.6 10.5h5.8M10.5 7.6v5.8"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Marks the zoom readout, so it can't be mistaken for the speed readout
 *  sitting beside it. */
function ZoomGlyph({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.4" stroke="currentColor" strokeWidth="2.1" />
      <path d="m15.4 15.4 4.4 4.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/** iPhone Safari implements none of the Fullscreen API, and TypeScript's DOM
   lib does not declare what it offers instead. These fill that gap — see
   toggleFullscreen for why each one is needed. */
type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenCapableVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};
type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/** Whatever is filling the screen, however this browser reports it. */
function fullscreenElementOf(doc: FullscreenCapableDocument): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** A 16:9 video on an upright phone is a stamp across the middle of the
 *  screen, so ask for landscape once fullscreen is granted. Android honours
 *  it; desktop refuses and iOS has no such API, and neither matters. */
function lockLandscape() {
  const orientation = screen?.orientation as (ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  }) | undefined;
  try {
    void orientation?.lock?.("landscape").catch(() => {});
  } catch {
    /* Refused, which is the expected answer nearly everywhere. */
  }
}

function releaseOrientation() {
  const orientation = screen?.orientation as (ScreenOrientation & { unlock?: () => void }) | undefined;
  try {
    orientation?.unlock?.();
  } catch {
    /* Nothing was locked. */
  }
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

/** Cloudflare Stream serves an HLS manifest; R2 serves the file itself. The
 *  extension is unambiguous, so it decides which path to take. */
function isHls(url: string): boolean {
  return url.split("?")[0]?.endsWith(".m3u8") ?? false;
}

const WATERMARK_MOVE_MS = 30_000;

/** Clear of the language toggle (top-right) and the control bar (bottom). */
const WATERMARK_SPOTS = [
  { top: "14%", left: "6%" },
  { top: "24%", left: "56%" },
  { top: "44%", left: "28%" },
  { top: "58%", left: "8%" },
  { top: "36%", left: "66%" },
  { top: "60%", left: "54%" },
];

/**
 * Two marks ride the frame, not one: a single tag can be cropped out of a
 * re-encode, and a crop that has to lose both takes most of the picture with
 * it. The second sits half the cycle ahead of the first, which is what keeps
 * them apart — no pair of spots that far apart in the list collides.
 */
const WATERMARK_OFFSET = WATERMARK_SPOTS.length / 2;
/** Keeps a mark off the very edge of the frame. */
const WATERMARK_INSET = 12;

export function VideoPlayer({
  initialLanguage = "en",
  className = "",
  autoPlay = false,
  sources = EPISODE_SOURCES,
  startAt = 0,
  idPrefix = "player",
  onPosition,
  onFinished,
  onLanguageChange,
  onMediaError,
  watermark,
}: {
  initialLanguage?: EpisodeLanguage;
  className?: string;
  autoPlay?: boolean;
  /**
   * Which file to play per language. Defaults to the free episode the
   * marketing site gives away, so /watch and the homepage dialog keep working
   * unchanged; the course view passes the episode it's showing.
   */
  sources?: Partial<Record<EpisodeLanguage, string>>;
  /** Resume point in seconds, applied once the first file reports metadata. */
  startAt?: number;
  /**
   * Prefixes the id on every control, so analytics can tell one surface's
   * play button from another's. GTM's built-in Click ID variable reads the
   * id attribute, which is why these are ids and not data attributes.
   */
  idPrefix?: string;
  /** Called as playback advances, for saving progress. Throttle in the parent —
   *  this fires as often as the browser updates currentTime. */
  onPosition?: (seconds: number, language: EpisodeLanguage) => void;
  onFinished?: (language: EpisodeLanguage) => void;
  onLanguageChange?: (language: EpisodeLanguage) => void;
  /** Playback failed — usually a signed URL that expired while the tab sat
   *  paused. The parent mints a fresh one and passes it back in `sources`. */
  onMediaError?: () => void;
  /**
   * Drawn faintly over the picture, repositioning as it plays. Not a lock —
   * anyone can delete the node — but it survives a screen recording, which is
   * the one leak path nothing here can block, and makes that recording
   * traceable to the account it was played on.
   */
  watermark?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  /** Position/play state carried across a language swap. */
  const resumeAt = useRef<{ time: number; playing: boolean } | null>(null);
  const resumedOnce = useRef(false);

  // An episode may exist in one language only. The toggle still shows both, so
  // the gap reads as a gap rather than a missing feature, but the absent one
  // can't be selected — and the opening language falls back to whichever
  // recording exists.
  const available = EPISODE_LANGUAGES.filter((option) => Boolean(sources[option.id]));
  const openingLanguage = sources[initialLanguage]
    ? initialLanguage
    : (available[0]?.id ?? initialLanguage);

  const [language, setLanguage] = useState<EpisodeLanguage>(openingLanguage);
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
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);

  // Moves so it can't be cropped out of a recording, and cycles clear of the
  // language toggle and the control bar rather than sitting under either.
  // While this player carries the viewer's identity, the page-wide watermark
  // stands down — otherwise the same email shows up twice on an episode page.
  useIdentityStamp(!!watermark);

  const [watermarkSpot, setWatermarkSpot] = useState(0);
  const markRef = useRef<HTMLSpanElement>(null);
  /** Frame and mark widths, so a spot can be placed in the room it really has.
   *  The observer fires once on observe, which is also the first measurement. */
  const [markRoom, setMarkRoom] = useState({ frame: 0, mark: 0 });
  useEffect(() => {
    const frame = wrapRef.current;
    const mark = markRef.current;
    if (!watermark || !frame || !mark) return;
    const observer = new ResizeObserver(() =>
      setMarkRoom({ frame: frame.clientWidth, mark: mark.offsetWidth }),
    );
    observer.observe(frame);
    observer.observe(mark);
    return () => observer.disconnect();
  }, [watermark]);

  /**
   * A spot's horizontal position, read as a fraction of the room the mark
   * actually has rather than of the frame. On a phone the email and phone
   * number come to nearly the width of the video, so a spot two thirds across
   * would put the tag through the right edge — and the frame clips, so it would
   * show up as a mark cut off mid-address.
   */
  const markLeft = (left: string): string => {
    if (!markRoom.frame || !markRoom.mark) return left;
    const travel = Math.max(0, markRoom.frame - markRoom.mark - WATERMARK_INSET * 2);
    return `${WATERMARK_INSET + (Number.parseFloat(left) / 100) * travel}px`;
  };

  useEffect(() => {
    if (!watermark) return;
    const id = window.setInterval(
      () => setWatermarkSpot((i) => (i + 1) % WATERMARK_SPOTS.length),
      WATERMARK_MOVE_MS,
    );
    return () => window.clearInterval(id);
  }, [watermark]);

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

  /* ------------------------------------------------------------------ *
   * Playback speed
   *
   * A stepper rather than a menu: a menu tall enough for seven rates
   * overflows the top of the frame, and the frame clips (overflow-hidden,
   * which fullscreen and the rounded corners both need). Stepping is also
   * the shape of the control people reach for — slower, slower, that'll do.
   * ------------------------------------------------------------------ */

  /** The rate the viewer chose. Loading a file resets the element's own
   *  playbackRate, so this is what it gets set back to; state can't be read
   *  from onLoadedMetadata without making it a dependency, hence the ref. */
  const speedRef = useRef(1);

  const applySpeed = useCallback((rate: number) => {
    const first = SPEEDS[0] ?? 0.5;
    const last = SPEEDS[SPEEDS.length - 1] ?? 2;
    const next = Math.min(Math.max(rate, first), last);
    const video = videoRef.current;
    if (video) {
      // Both, and defaultPlaybackRate first. The media load algorithm resets
      // playbackRate *to* defaultPlaybackRate, so setting the default is what
      // actually carries the rate across a language swap — the re-apply in
      // onLoadedMetadata is the belt to this braces, and covers hls.js, which
      // attaches a MediaSource rather than calling load().
      video.defaultPlaybackRate = next;
      video.playbackRate = next;
    }
    speedRef.current = next;
    setSpeed(next);
  }, []);

  const stepSpeed = useCallback(
    (direction: 1 | -1) => {
      const at = speedRef.current;
      let from = SPEEDS.indexOf(at);
      if (from < 0) {
        // Off-list — a browser is allowed to clamp playbackRate to something
        // it supports. Step from the nearest rate we do offer rather than
        // snapping back to 1× and losing their place in the list.
        from = SPEEDS.reduce(
          (best, rate, index) =>
            Math.abs(rate - at) < Math.abs((SPEEDS[best] ?? 1) - at) ? index : best,
          0,
        );
      }
      const next = SPEEDS[Math.min(Math.max(from + direction, 0), SPEEDS.length - 1)];
      if (next !== undefined) applySpeed(next);
    },
    [applySpeed],
  );

  /* ------------------------------------------------------------------ *
   * Zoom and pan
   *
   * The transform goes on the <video> alone, never on a wrapper holding the
   * watermark too. The marks are positioned against the frame, so zooming
   * the picture slides the picture under them and they stay put — which is
   * the point. Were they inside the transform, zooming in would be a way to
   * push the viewer's own email off the edge of a screen recording.
   * ------------------------------------------------------------------ */

  /** Gesture maths reads these, not state: a pinch updates every frame and a
   *  stale closure mid-gesture shows up as the picture snapping backwards. */
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  /** Live pointers, in the order they went down, so two of them can be told
   *  apart without caring which is which. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ spread: number; zoom: number } | null>(null);
  const dragFrom = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  /** Set once a press has travelled far enough to be a drag, so the click it
   *  ends with doesn't also pause the video. */
  const dragged = useRef(false);

  /** Writes the transform straight to the element. A pinch or a pan changes
   *  it every frame, and routing that through React would re-render the
   *  watermark and the whole control bar on each one. State carries only
   *  what the chrome has to display. */
  const paint = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const { x, y } = panRef.current;
    // translate before scale, so the pan stays in screen pixels and clampPan
    // can be written against the frame's own size.
    video.style.transform = `translate(${x}px, ${y}px) scale(${zoomRef.current})`;
  }, []);

  const setView = useCallback(
    (nextZoom: number, nextPan: { x: number; y: number }) => {
      const frame = wrapRef.current;
      const z = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM);
      zoomRef.current = z;
      panRef.current = frame
        ? clampPan(nextPan, z, frame.clientWidth, frame.clientHeight)
        : { x: 0, y: 0 };
      paint();
      setZoom(z);
    },
    [paint],
  );

  /**
   * Zoom about a point, so a pinch feels like the picture is being stretched
   * under the fingers rather than jumping to the middle and back.
   *
   * The transform origin is the frame's centre, so the focal point is
   * measured from there; without a point it zooms about the centre, which is
   * what the buttons and the keyboard want.
   */
  const zoomAt = useCallback(
    (next: number, clientX?: number, clientY?: number) => {
      const frame = wrapRef.current;
      if (!frame) return;
      const from = zoomRef.current;
      const to = Math.min(Math.max(next, MIN_ZOOM), MAX_ZOOM);
      if (to === from) return;
      const rect = frame.getBoundingClientRect();
      const fx = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
      const fy = clientY === undefined ? 0 : clientY - rect.top - rect.height / 2;
      const ratio = to / from;
      setView(to, {
        x: fx - (fx - panRef.current.x) * ratio,
        y: fy - (fy - panRef.current.y) * ratio,
      });
    },
    [setView],
  );

  const resetZoom = useCallback(() => setView(MIN_ZOOM, { x: 0, y: 0 }), [setView]);

  /** The transform is written imperatively, so React never knows about it and
   *  a remount would come back at 1× while the chrome still said otherwise.
   *  Re-asserting it whenever the zoom state moves covers both. */
  useEffect(() => {
    paint();
  }, [paint, zoom]);

  function spreadOf(points: { x: number; y: number }[]): number {
    const [a, b] = points;
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onVideoPointerDown(event: React.PointerEvent<HTMLVideoElement>) {
    const live = pointers.current;
    live.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged.current = false;

    if (live.size === 2) {
      // A second finger landed: this is a pinch, not a pan. Drop the pan so
      // the two don't both move the picture.
      pinch.current = { spread: spreadOf([...live.values()]), zoom: zoomRef.current };
      dragFrom.current = null;
      return;
    }
    if (live.size === 1 && zoomRef.current > MIN_ZOOM) {
      dragFrom.current = { x: event.clientX, y: event.clientY, pan: { ...panRef.current } };
      // Capture, so a pan that runs off the edge of the frame keeps going
      // instead of stopping dead where the pointer left.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onVideoPointerMove(event: React.PointerEvent<HTMLVideoElement>) {
    const live = pointers.current;
    if (!live.has(event.pointerId)) return;
    live.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const gesture = pinch.current;
    if (live.size >= 2 && gesture && gesture.spread > 0) {
      const points = [...live.values()];
      const spread = spreadOf(points);
      if (spread <= 0) return;
      const [a, b] = points;
      if (!a || !b) return;
      dragged.current = true;
      zoomAt((gesture.zoom * spread) / gesture.spread, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }

    const from = dragFrom.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (!dragged.current && Math.hypot(dx, dy) < DRAG_SLOP) return;
    dragged.current = true;
    setView(zoomRef.current, { x: from.pan.x + dx, y: from.pan.y + dy });
  }

  function onVideoPointerUp(event: React.PointerEvent<HTMLVideoElement>) {
    const live = pointers.current;
    live.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (live.size < 2) pinch.current = null;

    if (live.size === 0) {
      dragFrom.current = null;
      return;
    }
    if (live.size === 1 && zoomRef.current > MIN_ZOOM) {
      // One finger lifted out of a pinch. Carry on as a pan from wherever the
      // remaining finger is, rather than taking its distance from the lifted
      // one and throwing the picture across the frame.
      const remaining = [...live.values()][0];
      if (remaining) {
        dragFrom.current = { x: remaining.x, y: remaining.y, pan: { ...panRef.current } };
      }
    }
  }

  function onVideoClick() {
    // A pan or a pinch ends in a click. Pausing the class because they moved
    // the picture is not what anyone meant.
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    togglePlay();
  }

  /**
   * A trackpad pinch arrives as ctrl+wheel; a plain wheel has to go on
   * scrolling the page. React registers `wheel` passively at the root, so
   * preventDefault inside an onWheel prop is ignored and the browser would
   * zoom the whole page on top of the picture — hence a listener of our own.
   */
  useEffect(() => {
    const frame = wrapRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      // deltaY is negative pinching outwards. 240 is a divisor that makes a
      // normal trackpad pinch cover 1×–4× in about one gesture.
      zoomAt(zoomRef.current * (1 - event.deltaY / 240), event.clientX, event.clientY);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /**
   * touch-action alone can't say "one finger scrolls the page, two fingers
   * pinch the picture": the browser decides at touchstart, and `pan-y` lets
   * it claim a two-finger drag as a scroll halfway through a pinch — the
   * picture stops following your fingers and the page lurches instead.
   * Cancelling the second touchstart settles it before the browser commits.
   * It has to be non-passive, which React's own onTouchStart is not.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) event.preventDefault();
    };
    video.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => video.removeEventListener("touchstart", onTouchStart);
  }, []);

  /**
   * Enter or leave fullscreen by whichever route this browser offers.
   *
   * iPhone Safari has no Fullscreen API at all: no Element.requestFullscreen,
   * no document.fullscreenElement, no exitFullscreen. This used to call
   * `wrap.requestFullscreen?.()`, and on a phone that optional call quietly
   * evaluated to undefined — the button did nothing whatsoever.
   *
   * The one fullscreen an iPhone has is its native video player, entered
   * through the non-standard video.webkitEnterFullscreen(). It arrives with
   * iOS's own controls rather than ours; that is how every video on iOS
   * behaves and a page cannot override it. Zoom and speed are ours, so they
   * are not in that player — they work on an iPhone inline, not in its
   * fullscreen.
   *
   * Desktop Safari and older Android take the webkit-prefixed *element*
   * method, so the order is: standard, prefixed element, then the video.
   */
  const toggleFullscreen = useCallback(() => {
    const wrap = wrapRef.current as FullscreenCapableElement | null;
    const video = videoRef.current as FullscreenCapableVideo | null;
    const doc = document as FullscreenCapableDocument;
    if (!wrap) return;

    if (fullscreenElementOf(doc)) {
      void Promise.resolve(doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()).catch(() => {});
      return;
    }
    // The iPhone's native player is not a fullscreen *element*, so it has to
    // be asked separately whether it is up.
    if (video?.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.();
      return;
    }

    if (wrap.requestFullscreen) {
      void wrap.requestFullscreen().then(lockLandscape, () => {
        // Safari can refuse the element even where the method exists; the
        // native player is still there.
        video?.webkitEnterFullscreen?.();
      });
      return;
    }
    if (wrap.webkitRequestFullscreen) {
      void Promise.resolve(wrap.webkitRequestFullscreen()).then(lockLandscape, () => {});
      return;
    }
    video?.webkitEnterFullscreen?.();
  }, []);

  // Each route announces itself differently: the standard event, the
  // webkit-prefixed one, and — for the iPhone's native player — events on the
  // video element rather than the document.
  useEffect(() => {
    const video = videoRef.current as FullscreenCapableVideo | null;
    const doc = document as FullscreenCapableDocument;

    const sync = () => {
      const active =
        Boolean(fullscreenElementOf(doc)) ||
        Boolean((videoRef.current as FullscreenCapableVideo | null)?.webkitDisplayingFullscreen);
      setFullscreen(active);
      if (!active) releaseOrientation();
    };

    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    video?.addEventListener("webkitbeginfullscreen", sync);
    video?.addEventListener("webkitendfullscreen", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      video?.removeEventListener("webkitbeginfullscreen", sync);
      video?.removeEventListener("webkitendfullscreen", sync);
      releaseOrientation();
    };
  }, []);

  // The frame's size decides how far the picture may be panned, so a resize —
  // rotating the phone, entering fullscreen — can leave the pan out of
  // bounds. Re-clamping against the new size pulls it back.
  useEffect(() => {
    const frame = wrapRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => {
      if (zoomRef.current === MIN_ZOOM) return;
      setView(zoomRef.current, panRef.current);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [setView]);

  // Swap source, keeping the viewer's place.
  function changeLanguage(next: EpisodeLanguage) {
    const video = videoRef.current;
    if (!video || next === language) return;
    if (!sources[next]) return;
    resumeAt.current = { time: video.currentTime, playing: !video.paused };
    setLanguage(next);
    onLanguageChange?.(next);
  }

  /**
   * Reloads whenever the file behind the current language changes — a language
   * swap, or a re-minted URL after the old one expired.
   *
   * Keyed on the URL rather than the language so both cases go through one
   * path, and the viewer keeps their place either way: a refresh mid-episode
   * that dropped them back to zero would be worse than the expiry it fixes.
   */
  const currentSrc = sources[language] ?? "";
  const loadedSrc = useRef<string | null>(null);

  const hlsRef = useRef<HlsType | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSrc || loadedSrc.current === currentSrc) return;
    const isSwap = loadedSrc.current !== null;
    loadedSrc.current = currentSrc;
    // changeLanguage has already captured the position; a URL refresh has not.
    if (isSwap && !resumeAt.current) {
      resumeAt.current = { time: video.currentTime, playing: !video.paused };
    }

    hlsRef.current?.destroy();
    hlsRef.current = null;

    // A Cloudflare Stream manifest rather than a file. Safari plays HLS
    // natively; everywhere else needs hls.js, which is loaded on demand so the
    // marketing pages don't carry it for a video they may never open.
    if (!isHls(currentSrc)) {
      video.load();
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentSrc;
      video.load();
      return;
    }

    let cancelled = false;
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        // No Media Source Extensions — nothing left to try.
        setWaiting(false);
        onMediaError?.();
        return;
      }
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Only fatal errors are worth surfacing; hls.js recovers from the rest
        // on its own, and reporting those would re-mint a URL for nothing.
        if (data.fatal) onMediaError?.();
      });
      hls.loadSource(currentSrc);
      hls.attachMedia(videoRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, [currentSrc, onMediaError]);

  useEffect(() => () => hlsRef.current?.destroy(), []);

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    // Loading resets the element's rate. Without this, switching ML↔EN at
    // 1.5× silently drops back to normal speed mid-class.
    video.defaultPlaybackRate = speedRef.current;
    video.playbackRate = speedRef.current;

    // First load only: a saved position resumes where they stopped. Guarded so
    // a language swap uses its own captured time rather than jumping back.
    if (!resumedOnce.current) {
      resumedOnce.current = true;
      if (startAt > 0 && startAt < video.duration - 5) video.currentTime = startAt;
    }

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
    const handled = [
      " ", "k", "arrowleft", "arrowright", "arrowup", "arrowdown", "m", "f",
      // Speed, on the keys YouTube uses, with both the shifted and unshifted
      // forms so it works without reaching for shift.
      ",", "<", ".", ">",
      // Zoom, and 0 to put the picture back.
      "-", "_", "+", "=", "0",
    ];
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
    else if (key === "," || key === "<") stepSpeed(-1);
    else if (key === "." || key === ">") stepSpeed(1);
    else if (key === "-" || key === "_") zoomAt(zoomRef.current - ZOOM_STEP);
    else if (key === "+" || key === "=") zoomAt(zoomRef.current + ZOOM_STEP);
    else if (key === "0") resetZoom();
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const chromeShown = chromeVisible || !playing;
  const zoomed = zoom > MIN_ZOOM;

  /** Shared by the two steppers, so speed and zoom read as one control type.
   *  Carries no `display` of its own on purpose: the zoom pair is hidden below
   *  sm, and an `inline-flex` in here would be emitted after `hidden` in
   *  Tailwind's sheet and quietly win, putting both back on a phone. */
  const stepperButton =
    "size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div
      id={`${idPrefix}-shell`}
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={showChrome}
      onPointerLeave={() => playing && setChromeVisible(false)}
      className={`video-shell group relative aspect-video w-full overflow-hidden rounded-2xl bg-black outline-none select-none focus-visible:ring-2 focus-visible:ring-lime-30 ${className}`}
    >
      <video
        id={`${idPrefix}-video`}
        ref={videoRef}
        className="h-full w-full object-contain"
        style={{
          // At 1× a one-finger drag should still scroll the page; the picture
          // only takes the finger over once there is something to pan.
          touchAction: zoomed ? "none" : "pan-y",
          cursor: zoomed ? "grab" : undefined,
          willChange: zoomed ? "transform" : undefined,
        }}
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
        // Takes the obvious routes to a local copy off the table: no "Save
        // video as" in the right-click menu, no download button if a browser
        // falls back to native controls (some mobile ones do in fullscreen),
        // and no picture-in-picture window with its own controls.
        //
        // These are speed bumps, not protection — the real gate is that the
        // URL is signed and expires (see academy-api/src/media/r2.ts). Anyone
        // reading the DOM still has the URL until it does.
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onVideoPointerDown}
        onPointerMove={onVideoPointerMove}
        onPointerUp={onVideoPointerUp}
        onPointerCancel={onVideoPointerUp}
        onClick={onVideoClick}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime);
          onPosition?.(e.currentTarget.currentTime, language);
        }}
        onProgress={onProgress}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        /* Deliberately no onRateChange. Loading a file fires one as the
           element resets its own rate, and syncing speedRef from it wiped the
           very value onLoadedMetadata reads back — switching ML↔EN at 1.75×
           dropped silently to 1×. The rate the viewer picked lives in
           speedRef and only their input changes it. */
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
          onFinished?.(language);
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onError={() => {
          setWaiting(false);
          onMediaError?.();
        }}
      >
        {!isHls(currentSrc) && <source src={currentSrc} type="video/mp4" />}
      </video>

      {watermark &&
        [0, 1].map((nth) => {
          // Keyed by position in the pair, not by spot, so the same node drifts
          // between spots rather than being replaced and jumping.
          const spot = WATERMARK_SPOTS[(watermarkSpot + nth * WATERMARK_OFFSET) % WATERMARK_SPOTS.length]!;
          return (
            <span
              key={nth}
              id={`${idPrefix}-watermark-${nth}`}
              ref={nth === 0 ? markRef : undefined}
              aria-hidden
              className="pointer-events-none absolute font-noi-grotesk text-[11px] leading-none tracking-[0.06em] text-white/30 mix-blend-difference transition-[top,left] duration-1000 ease-in-out select-none sm:text-[12px]"
              style={{ top: spot.top, left: markLeft(spot.left) }}
            >
              {watermark}
            </span>
          );
        })}

      {/* Centre affordance — the whole point of the first frame. Only the
          button itself takes pointers: a full-frame overlay would swallow a
          pinch while the video sat paused, and tapping the frame already
          plays through the video's own click. */}
      {(!started || !playing) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-200">
          <button
            id={`${idPrefix}-play-overlay`}
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="pointer-events-auto flex size-16 items-center justify-center rounded-full bg-lime-30 text-neutral-90 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:scale-105 sm:size-20"
          >
            <PlayIcon className="ml-0.5 size-7 sm:size-8" />
          </button>
        </div>
      )}

      {waiting && started && (
        <span
          id={`${idPrefix}-spinner`}
          className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-lime-30"
        />
      )}

      {/* Language switch, top-right so it never sits under the scrub bar. */}
      <div
        id={`${idPrefix}-languages`}
        className={`absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 p-1 backdrop-blur-md transition-opacity duration-300 sm:top-4 sm:right-4 ${
          chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {EPISODE_LANGUAGES.map((option) => {
          const missing = !sources[option.id];
          return (
            <button
              key={option.id}
              id={`${idPrefix}-lang-${option.id}`}
              type="button"
              onClick={() => changeLanguage(option.id)}
              disabled={missing}
              aria-pressed={language === option.id}
              title={missing ? `${option.label} isn't available for this episode yet` : option.label}
              className={`rounded-full px-3 py-1 font-noi-grotesk text-[12px] leading-none font-semibold tracking-[0.04em] transition-colors duration-150 ${
                missing
                  ? "cursor-not-allowed text-white/25 line-through"
                  : language === option.id
                    ? "bg-lime-30 text-neutral-90"
                    : "text-white/70 hover:text-white"
              }`}
            >
              {option.short}
            </button>
          );
        })}
      </div>

      {/* Control bar */}
      <div
        id={`${idPrefix}-controls`}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-10 pb-3 transition-opacity duration-300 sm:px-4 sm:pb-4 ${
          chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          id={`${idPrefix}-seek`}
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

        <div className="mt-1.5 flex items-center gap-2 text-white sm:gap-4">
          <button
            id={`${idPrefix}-play`}
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
              id={`${idPrefix}-mute`}
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
              id={`${idPrefix}-volume`}
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

          <span
            id={`${idPrefix}-time`}
            className="font-noi-grotesk text-[12px] leading-none tabular-nums text-white/80 sm:text-[13px]"
          >
            {formatTime(current)} <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            {/* Zoom. The steppers are for a mouse; on touch the gesture is
                the control, so only the readout — which doubles as the way
                back to 1× — follows you onto a phone. */}
            <div className="flex items-center gap-0.5">
              <button
                id={`${idPrefix}-zoom-out`}
                type="button"
                onClick={() => zoomAt(zoomRef.current - ZOOM_STEP)}
                disabled={!zoomed}
                aria-label="Zoom out"
                title="Zoom out (−)"
                className={`hidden sm:inline-flex ${stepperButton}`}
              >
                <ZoomIcon out className="size-[18px]" />
              </button>
              {zoomed && (
                <button
                  id={`${idPrefix}-zoom-reset`}
                  type="button"
                  onClick={resetZoom}
                  aria-label={`Zoomed ${formatRate(zoom)} — reset`}
                  title="Reset zoom (0)"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-lime-30/50 px-2 font-noi-grotesk text-[12px] leading-none font-medium tabular-nums text-lime-30 transition-colors duration-150 hover:bg-lime-30/15"
                >
                  <ZoomGlyph />
                  {formatRate(zoom)}
                </button>
              )}
              <button
                id={`${idPrefix}-zoom-in`}
                type="button"
                onClick={() => zoomAt(zoomRef.current + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                title="Zoom in (+)"
                className={`hidden sm:inline-flex ${stepperButton}`}
              >
                <ZoomIcon className="size-[18px]" />
              </button>
            </div>

            {/* Speed */}
            <div
              id={`${idPrefix}-speed`}
              className="flex items-center gap-0.5 rounded-full border border-white/20 pr-0.5 pl-0.5"
            >
              <button
                id={`${idPrefix}-speed-down`}
                type="button"
                onClick={() => stepSpeed(-1)}
                disabled={speed <= (SPEEDS[0] ?? 0.5)}
                aria-label="Slower"
                title="Slower (,)"
                className={`inline-flex ${stepperButton}`}
              >
                <span aria-hidden className="text-[17px] leading-none font-medium">
                  &minus;
                </span>
              </button>
              <button
                id={`${idPrefix}-speed-reset`}
                type="button"
                onClick={() => applySpeed(1)}
                aria-label={`Speed ${formatRate(speed)} — reset to normal`}
                title="Normal speed"
                className="min-w-[38px] shrink-0 px-0.5 font-noi-grotesk text-[12px] leading-none font-medium tabular-nums text-white transition-opacity duration-150 hover:opacity-70"
              >
                {formatRate(speed)}
              </button>
              <button
                id={`${idPrefix}-speed-up`}
                type="button"
                onClick={() => stepSpeed(1)}
                disabled={speed >= (SPEEDS[SPEEDS.length - 1] ?? 2)}
                aria-label="Faster"
                title="Faster (.)"
                className={`inline-flex ${stepperButton}`}
              >
                <span aria-hidden className="text-[17px] leading-none font-medium">
                  +
                </span>
              </button>
            </div>

            <button
              id={`${idPrefix}-fullscreen`}
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
              className="shrink-0 transition-opacity duration-150 hover:opacity-80"
            >
              <FullscreenIcon active={fullscreen} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
