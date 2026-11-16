import { ObjectId, type Db } from "mongodb";
import { getDb } from "./mongodb";
import { COLLECTION as ENROLLMENTS, LIVE } from "./enrollments";
import type { StudentRow, WatchReport, StudentDetail, WatchState } from "./watch-states";

/**
 * Who has actually watched the classes.
 *
 * The course platform (../academy-api) writes these collections and the
 * marketing site reads them: both point at the same database, so this needs no
 * API call. Everything here is read-only — the one destructive operation lives
 * in lib/student-access.ts, on its own, where it is hard to call by accident.
 *
 * One honest limitation runs through all of it. The platform records
 * `positionSec` — the furthest point someone reached in an episode — and not
 * how long they sat watching. Someone who skips to the final minute looks
 * identical to someone who watched the whole thing, and re-watching doesn't
 * accumulate. So nothing here is labelled "time watched":
 *
 *   - `finished` counts episodes with a `completedAt`, which the player sets
 *     once and never clears. That figure is trustworthy, and it's the one the
 *     progress bars and the headline counts are built on.
 *   - `furthestSec` is the sum of those furthest points. It answers "how far
 *     into the course have they got", and it can legitimately exceed the
 *     course's own length, because the two languages of an episode are not the
 *     same number of seconds.
 */

const USERS = "users";
const PROGRESS = "progress";
const EPISODES = "episodes";
const MODULES = "modules";
const ENTITLEMENTS = "entitlements";
const SESSIONS = "sessions";
const DEVICES = "devices";

/**
 * How long a start has to go quiet before it reads as abandoned rather than in
 * progress. Three weeks: the classes are released as a set and watched at
 * whatever pace people manage, so a fortnight's gap is a holiday, not a
 * dropout.
 */
const STALLED_DAYS = 21;

/* The shapes these functions return, and the helpers that format them, live in
   ./watch-states so the admin's client components can import them without
   pulling this file's MongoDB driver into the browser bundle. Re-exported here
   as types only, which compile away. */
export type {
  WatchState,
  StudentRow,
  WatchReport,
  EpisodeProgress,
  StudentDetail,
} from "./watch-states";

type UserDoc = {
  _id: ObjectId;
  email: string;
  name?: string;
  phone?: string;
  country?: string;
  createdAt: Date;
};

type EpisodeDoc = {
  _id: ObjectId;
  moduleId?: ObjectId;
  key: string;
  order: number;
  title?: { en?: string; ml?: string };
  media?: { en?: { durationSec?: number }; ml?: { durationSec?: number } };
};

type ProgressDoc = {
  userId: ObjectId;
  episodeId: ObjectId;
  positionSec: number;
  completedAt?: Date | null;
  lastLang?: string;
  updatedAt: Date;
};

/** The length we treat an episode as having. English is the reference cut —
 *  it's the one every episode has. */
function episodeDuration(episode: EpisodeDoc): number {
  return episode.media?.en?.durationSec || episode.media?.ml?.durationSec || 0;
}

function episodeTitle(episode: EpisodeDoc): string {
  return episode.title?.en || episode.title?.ml || episode.key;
}

const norm = (email: string) => email.trim().toLowerCase();

function stateOf(
  started: number,
  finished: number,
  totalEpisodes: number,
  lastSeen: Date | null,
): WatchState {
  if (started === 0) return "never";
  if (totalEpisodes > 0 && finished >= totalEpisodes) return "finished";
  const quietFor = lastSeen ? Date.now() - lastSeen.getTime() : Infinity;
  if (quietFor > STALLED_DAYS * 24 * 60 * 60 * 1000) return "stalled";
  return "watching";
}

type Totals = { started: number; finished: number; furthestSec: number; lastSeenAt: Date | null };

/** Grouped in the database rather than here: it is the one query whose input
 *  grows per episode watched rather than per student. */
async function progressTotals(db: Db): Promise<Map<string, Totals>> {
  const grouped = await db
    .collection<ProgressDoc>(PROGRESS)
    .aggregate<{ _id: ObjectId; started: number; finished: number; furthestSec: number; lastSeenAt: Date }>([
      {
        $group: {
          _id: "$userId",
          started: { $sum: 1 },
          finished: { $sum: { $cond: [{ $ifNull: ["$completedAt", false] }, 1, 0] } },
          furthestSec: { $sum: "$positionSec" },
          lastSeenAt: { $max: "$updatedAt" },
        },
      },
    ])
    .toArray();

  return new Map(
    grouped.map((row) => [
      row._id.toHexString(),
      {
        started: row.started,
        finished: row.finished,
        furthestSec: row.furthestSec,
        lastSeenAt: row.lastSeenAt ?? null,
      },
    ]),
  );
}

export async function getWatchReport(): Promise<WatchReport | null> {
  const db = await getDb();
  if (!db) return null;

  const [episodes, totals, users, entitledIds, enrollments] = await Promise.all([
    db.collection<EpisodeDoc>(EPISODES).find({}, { projection: { media: 1 } }).toArray(),
    progressTotals(db),
    db
      .collection<UserDoc>(USERS)
      .find({}, { projection: { email: 1, name: 1, phone: 1, country: 1, createdAt: 1 } })
      .toArray(),
    db.collection(ENTITLEMENTS).distinct("userId"),
    db
      .collection(ENROLLMENTS)
      .find(LIVE, { projection: { email: 1 } })
      .toArray(),
  ]);

  const courseDurationSec = episodes.reduce((sum, episode) => sum + episodeDuration(episode), 0);
  const entitled = new Set(entitledIds.map((id) => String(id)));

  /* Last payment row wins per email. Duplicates are the same person paying
     twice; either row leads to the same place in the payments table. */
  const enrollmentByEmail = new Map<string, string>();
  for (const row of enrollments) {
    if (typeof row.email === "string") enrollmentByEmail.set(norm(row.email), row._id.toHexString());
  }

  const students: StudentRow[] = users.map((user) => {
    const t = totals.get(user._id.toHexString()) ?? {
      started: 0,
      finished: 0,
      furthestSec: 0,
      lastSeenAt: null,
    };
    return {
      id: user._id.toHexString(),
      name: user.name?.trim() || null,
      email: user.email,
      phone: user.phone?.trim() || null,
      country: user.country?.trim() || null,
      joinedAt: new Date(user.createdAt).toISOString(),
      entitled: entitled.has(user._id.toHexString()),
      started: t.started,
      finished: t.finished,
      furthestSec: t.furthestSec,
      lastSeenAt: t.lastSeenAt ? new Date(t.lastSeenAt).toISOString() : null,
      state: stateOf(t.started, t.finished, episodes.length, t.lastSeenAt),
      enrollmentId: enrollmentByEmail.get(norm(user.email)) ?? null,
    };
  });

  /* Furthest through the course first — the question the page exists to answer
     is how far people have got, and the filters above the table are what turn
     it into a list of who to chase. */
  students.sort(
    (a, b) => b.finished - a.finished || b.furthestSec - a.furthestSec ||
      (a.name ?? a.email).localeCompare(b.name ?? b.email),
  );

  const accountEmails = new Set(users.map((user) => norm(user.email)));
  const unmatchedEnrollments = [...enrollmentByEmail.keys()].filter(
    (email) => !accountEmails.has(email),
  ).length;

  const counts = {
    total: students.length,
    entitled: students.filter((s) => s.entitled).length,
    finished: students.filter((s) => s.state === "finished").length,
    watching: students.filter((s) => s.state === "watching").length,
    stalled: students.filter((s) => s.state === "stalled").length,
    never: students.filter((s) => s.state === "never").length,
  };

  return {
    course: { episodes: episodes.length, durationSec: courseDurationSec },
    students,
    counts,
    unmatchedEnrollments,
  };
}


export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  if (!db) return null;

  const userId = new ObjectId(id);
  const user = await db.collection<UserDoc>(USERS).findOne({ _id: userId });
  if (!user) return null;

  const [episodes, modules, rows, entitlements, sessions, devices, enrollment] = await Promise.all([
    db.collection<EpisodeDoc>(EPISODES).find({}).toArray(),
    db.collection<{ _id: ObjectId; order?: number }>(MODULES).find({}, { projection: { order: 1 } }).toArray(),
    db.collection<ProgressDoc>(PROGRESS).find({ userId }).toArray(),
    db.collection(ENTITLEMENTS).countDocuments({ userId }),
    db.collection(SESSIONS).countDocuments({ userId, revokedAt: { $in: [null, undefined] } }),
    db.collection(DEVICES).countDocuments({ userId }),
    db.collection(ENROLLMENTS).findOne(
      { email: { $regex: `^${user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, ...LIVE },
      { projection: { _id: 1 } },
    ),
  ]);

  const moduleOrder = new Map(modules.map((m) => [m._id.toHexString(), m.order ?? 0]));
  const byEpisode = new Map(rows.map((row) => [row.episodeId.toHexString(), row]));

  const ordered = [...episodes].sort(
    (a, b) =>
      (moduleOrder.get(a.moduleId?.toHexString() ?? "") ?? 0) -
        (moduleOrder.get(b.moduleId?.toHexString() ?? "") ?? 0) || a.order - b.order,
  );

  const finished = rows.filter((row) => row.completedAt).length;
  const furthestSec = rows.reduce((sum, row) => sum + row.positionSec, 0);
  const lastSeenAt = rows.reduce<Date | null>(
    (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
    null,
  );

  return {
    student: {
      id,
      name: user.name?.trim() || null,
      email: user.email,
      phone: user.phone?.trim() || null,
      country: user.country?.trim() || null,
      joinedAt: new Date(user.createdAt).toISOString(),
      entitled: entitlements > 0,
      started: rows.length,
      finished,
      furthestSec,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
      state: stateOf(rows.length, finished, episodes.length, lastSeenAt),
      enrollmentId: enrollment?._id.toHexString() ?? null,
    },
    episodes: ordered.map((episode) => {
      const row = byEpisode.get(episode._id.toHexString());
      return {
        id: episode._id.toHexString(),
        title: episodeTitle(episode),
        durationSec: episodeDuration(episode),
        positionSec: row?.positionSec ?? 0,
        completed: Boolean(row?.completedAt),
        lastLang: row?.lastLang ?? null,
        updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      };
    }),
    sessions,
    devices,
  };
}
