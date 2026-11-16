/**
 * The vocabulary of watch progress: the shapes the admin table renders and the
 * two helpers that format them.
 *
 * Split out of lib/watch-progress.ts, which opens a MongoDB connection, so the
 * client components can import these without dragging the driver into the
 * browser bundle — the same reason lib/email-kinds.ts sits apart from
 * lib/email.ts.
 */

export type WatchState = "finished" | "watching" | "stalled" | "never";

export const WATCH_STATE_LABEL: Record<WatchState, string> = {
  finished: "Finished",
  watching: "Watching",
  stalled: "Stalled",
  never: "Never watched",
};

export const WATCH_STATES: WatchState[] = ["watching", "finished", "stalled", "never"];

export type StudentRow = {
  /** The account's id — what the delete and the detail view are addressed to. */
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  joinedAt: string;
  /** Whether a payment or coupon actually granted them the course. */
  entitled: boolean;
  started: number;
  finished: number;
  /**
   * The sum of the furthest points they reached, in seconds. Not time spent
   * watching — see the note at the top of lib/watch-progress.ts — and it can
   * exceed the course's own length, because an episode's two languages are
   * different durations.
   */
  furthestSec: number;
  lastSeenAt: string | null;
  state: WatchState;
  /** The payment row on this email, or null when the two don't match up. */
  enrollmentId: string | null;
};

export type WatchReport = {
  course: { episodes: number; durationSec: number };
  students: StudentRow[];
  counts: { total: number; entitled: number } & Record<WatchState, number>;
  unmatchedEnrollments: number;
};

export type EpisodeProgress = {
  id: string;
  title: string;
  durationSec: number;
  positionSec: number;
  completed: boolean;
  lastLang: string | null;
  updatedAt: string | null;
};

export type StudentDetail = {
  student: StudentRow;
  /** Every episode in course order, watched or not — the gaps are the point. */
  episodes: EpisodeProgress[];
  /** What a delete would end: live sign-ins and approved browsers. */
  sessions: number;
  devices: number;
};

/** "3h 12m", or "12m" under the hour — minutes alone stop being readable
 *  somewhere around the four-hour mark. */
export function formatDuration(totalSec: number): string {
  const mins = Math.round(totalSec / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

/** How far through an episode they got, capped: a position a second past the
 *  end would otherwise render as a bar overflowing its track. */
export function percentOf(positionSec: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.min(100, Math.round((positionSec / durationSec) * 100));
}
