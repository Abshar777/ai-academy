/**
 * Types and base URL for the course platform (../academy-api).
 *
 * The browser talks to it directly rather than through Next route handlers:
 * the session lives in a cookie scoped to the shared parent domain, so the
 * two origins already trust each other, and proxying would only add a hop.
 */

export const ACADEMY_API_URL = (
  process.env.NEXT_PUBLIC_ACADEMY_API_URL ?? "http://localhost:6112"
).replace(/\/$/, "");

/** The course a purchase on this site buys. */
export const COURSE_SLUG = "ai-academy";

export type Lang = "en" | "ml";

/** Malayalam is optional throughout: several episodes have an English
 *  recording and no Malayalam one, and the UI says so rather than pretending. */
export type Localized = { en: string; ml?: string };

export type AcademyUser = {
  id: string;
  email: string;
  name?: string;
  preferredLang: Lang;
};

export type EpisodeProgress = {
  positionSec: number;
  completed: boolean;
  lastLang: Lang;
};

export type EpisodeSummary = {
  id: string;
  key: string;
  order: number;
  title: Localized;
  blurb: Localized;
  isFree: boolean;
  /** Only the languages that actually have a recording appear here. */
  languages: Partial<Record<Lang, { durationSec: number }>>;
  progress: EpisodeProgress | null;
};

export type ModuleSummary = {
  id: string;
  order: number;
  title: Localized;
  blurb: Localized;
  episodes: EpisodeSummary[];
};

export type CourseResponse = {
  course: { slug: string; title: Localized; blurb: Localized };
  entitled: boolean;
  resumeEpisodeId: string | null;
  modules: ModuleSummary[];
};

export type PlayResponse = {
  episodeId: string;
  title: Localized;
  isFree: boolean;
  sources: Partial<Record<Lang, { url: string; durationSec: number }>>;
  /** Seconds the signed URLs remain valid. Callers re-mint before this runs
   *  out rather than letting playback die mid-episode. */
  expiresIn?: number;
};

/** Set beside the httpOnly session cookie, carrying nothing but the fact that
 *  a session exists — lets the page skip a refresh call for visitors who have
 *  never signed in. */
export const SESSION_HINT_COOKIE = "da_session";

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_HINT_COOKIE}=`));
}

/** Picks the text for a language, falling back to English — which is always
 *  present — when a Malayalam title was never written. */
export function localized(value: Localized | undefined, lang: Lang): string {
  if (!value) return "";
  return (lang === "ml" ? value.ml : value.en) || value.en || "";
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
