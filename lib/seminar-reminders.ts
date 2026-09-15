import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import { sendSeminarReminderEmail } from "./email";
import {
  formatWebinarDate,
  formatWebinarTime,
  nextWebinarSession,
  type WebinarSession,
} from "./next-webinar";
import { listSeminarRegistrations } from "./seminar-registrations";

/**
 * Reminder emails before a free seminar: 30, 15, 10, 5 and 3 minutes ahead,
 * and one as it starts. Sent automatically by the scheduler in instrumentation.ts
 * (or an external cron hitting /api/seminar/reminders/tick), and by hand from
 * the admin's seminar page.
 *
 * Two rules keep this from ever spamming a registrant:
 *
 * Each stage has a window that runs from its own minute mark up to the next
 * stage's, so at any instant at most one stage is due. A server that was down
 * through the 30- and 15-minute marks and comes back at 19:26 sends the
 * 5-minute reminder and nothing else — not a burst of everything it missed.
 *
 * Each automatic send is claimed in Mongo before a single email goes out,
 * under a unique index on (session, stage). Two processes ticking at once, or
 * one ticking every thirty seconds, cannot both send: the second insert fails
 * and that caller stands down. Manual sends are recorded too but never
 * blocked — an admin pressing the button means it.
 */

export const REMINDER_STAGES = [30, 15, 10, 5, 3, 0] as const;
export type ReminderStage = (typeof REMINDER_STAGES)[number];

/** Where the session runs. The env var wins so the link can change without a
 *  deploy; the default is the room the sessions have been using. */
export const SEMINAR_MEET_URL =
  process.env.SEMINAR_MEET_URL?.trim() || "https://meet.google.com/jxe-okwn-vux?authuser=0";

/** How long after the start the "starting now" reminder may still go out. */
const START_GRACE_MS = 10 * 60_000;

/** A session that started up to this long ago still counts as "the next one",
 *  so the start-time reminder can find it after the instant has passed. */
const LOOKBACK_MS = 15 * 60_000;

/** How many emails are handed to the mailer at once. The transport is pooled
 *  and rate-limited (lib/email.ts), so this only bounds the queue in front of
 *  it, not the number of logins. */
const BATCH = 5;

/** A claim this old with no finish is a process that died between claiming
 *  and sending — a deploy landing mid-window does exactly that. */
const STALE_CLAIM_MS = 2 * 60_000;

export type ReminderRecord = {
  startsAt: string;
  stage: ReminderStage;
  kind: "auto" | "manual" | "test";
  claimedAt: Date;
  finishedAt?: Date;
  recipients: number;
  sent: number;
  failed: number;
  /** For tests: the one address it went to. */
  to?: string;
};

const COLLECTION = "seminar_reminders";
let indexEnsured = false;

async function collection(): Promise<Collection<ReminderRecord> | null> {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection<ReminderRecord>(COLLECTION);
  if (!indexEnsured) {
    // Only automatic sends are unique per stage. Manual and test sends are
    // allowed to repeat, and must not collide with the automatic one either.
    await col.createIndex(
      { startsAt: 1, stage: 1 },
      { unique: true, partialFilterExpression: { kind: "auto" }, name: "one_auto_send_per_stage" },
    );
    indexEnsured = true;
  }
  return col;
}

/** The instants between which a stage is due. Contiguous with its neighbours:
 *  the 30-minute window ends where the 15-minute one begins. */
export function stageWindow(session: WebinarSession, stage: ReminderStage): { from: number; until: number } {
  const start = Date.parse(session.startsAt);
  const next = REMINDER_STAGES[REMINDER_STAGES.indexOf(stage) + 1];
  return {
    from: start - stage * 60_000,
    until: next === undefined ? start + START_GRACE_MS : start - next * 60_000,
  };
}

/** The single stage due at `now`, if any. */
export function dueStage(session: WebinarSession, now = Date.now()): ReminderStage | null {
  return (
    REMINDER_STAGES.find((stage) => {
      const { from, until } = stageWindow(session, stage);
      return now >= from && now < until;
    }) ?? null
  );
}

/** The session reminders are about: the next one ahead, or the one that
 *  started within the last few minutes. */
export function reminderSession(now = new Date()): WebinarSession | null {
  return nextWebinarSession(new Date(now.getTime() - LOOKBACK_MS));
}

function whenLabel(session: WebinarSession): string {
  const date = new Date(session.startsAt);
  return `${formatWebinarDate(date)} · ${formatWebinarTime(date)}`;
}

async function recipientsFor(session: WebinarSession): Promise<{ name: string; email: string }[]> {
  const all = (await listSeminarRegistrations(5000)) ?? [];
  const seen = new Set<string>();
  const people: { name: string; email: string }[] = [];
  for (const r of all) {
    if (r.startsAt !== session.startsAt) continue;
    const email = r.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    people.push({ name: r.name ?? "", email });
  }
  return people;
}

async function deliver(
  session: WebinarSession,
  stage: ReminderStage,
  people: { name: string; email: string }[],
): Promise<{ sent: number; failed: number }> {
  const when = whenLabel(session);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < people.length; i += BATCH) {
    const results = await Promise.allSettled(
      people.slice(i, i + BATCH).map((person) =>
        sendSeminarReminderEmail({
          name: person.name,
          email: person.email,
          title: session.title,
          speaker: session.speaker,
          when,
          minutesBefore: stage,
          meetLink: SEMINAR_MEET_URL,
        }),
      ),
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.sent) sent += 1;
      else failed += 1;
    }
  }
  return { sent, failed };
}

export type RunResult = {
  session: string | null;
  /** What this call actually sent. Empty on a quiet tick. */
  ran: { stage: ReminderStage; recipients: number; sent: number; failed: number }[];
  /** Why nothing went out, when nothing did. */
  note?: string;
};

/**
 * One scheduler tick. Safe to call as often as you like: it sends only what is
 * due and not yet claimed, and claims before sending.
 */
export async function runDueReminders(now = new Date()): Promise<RunResult> {
  const session = reminderSession(now);
  if (!session) return { session: null, ran: [], note: "no upcoming session" };

  const stage = dueStage(session, now.getTime());
  if (stage === null) return { session: session.startsAt, ran: [], note: "nothing due" };

  const col = await collection();
  if (!col) {
    // Without Mongo there is no idempotency and, in practice, no registrants
    // either — they live in the same database.
    return { session: session.startsAt, ran: [], note: "MongoDB not configured" };
  }

  try {
    await col.insertOne({ startsAt: session.startsAt, stage, kind: "auto", claimedAt: now, recipients: 0, sent: 0, failed: 0 });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    // Claimed already. If that claim never finished, the process holding it
    // died between claiming and sending — take it over. The filter makes the
    // takeover atomic: only one caller can move claimedAt forward.
    const takeover = await col.updateOne(
      {
        startsAt: session.startsAt,
        stage,
        kind: "auto",
        finishedAt: { $exists: false },
        claimedAt: { $lt: new Date(now.getTime() - STALE_CLAIM_MS) },
      },
      { $set: { claimedAt: now } },
    );
    if (takeover.modifiedCount !== 1) {
      return { session: session.startsAt, ran: [], note: `stage ${stage} already sent` };
    }
    console.warn(`[seminar/reminders] stage ${stage} was claimed but never finished — taking it over`);
  }

  const people = await recipientsFor(session);
  const outcome = await deliver(session, stage, people);
  await col.updateOne(
    { startsAt: session.startsAt, stage, kind: "auto" },
    { $set: { finishedAt: new Date(), recipients: people.length, ...outcome } },
  );
  return { session: session.startsAt, ran: [{ stage, recipients: people.length, ...outcome }] };
}

/**
 * The admin's button. Sends a stage's email to every registrant of the next
 * session right now, regardless of the clock and of what has already gone out
 * — or, with `testTo`, that one email to a single address so the admin can see
 * it before anyone else does.
 */
export async function sendReminderNow(
  stage: ReminderStage,
  options: { testTo?: string } = {},
): Promise<{ ok: boolean; error?: string; recipients: number; sent: number; failed: number }> {
  const session = reminderSession();
  if (!session) return { ok: false, error: "There is no upcoming session to remind people about.", recipients: 0, sent: 0, failed: 0 };

  const people = options.testTo
    ? [{ name: "", email: options.testTo.trim().toLowerCase() }]
    : await recipientsFor(session);

  if (people.length === 0) {
    return { ok: false, error: "Nobody is registered for this session yet.", recipients: 0, sent: 0, failed: 0 };
  }

  const outcome = await deliver(session, stage, people);
  const col = await collection();
  await col?.insertOne({
    startsAt: session.startsAt,
    stage,
    kind: options.testTo ? "test" : "manual",
    claimedAt: new Date(),
    finishedAt: new Date(),
    recipients: people.length,
    ...outcome,
    ...(options.testTo ? { to: options.testTo.trim().toLowerCase() } : {}),
  });

  return { ok: outcome.failed === 0, recipients: people.length, ...outcome };
}

export type ReminderStatus = {
  session: { startsAt: string; title: string; when: string; minutesUntilStart: number } | null;
  registrants: number;
  meetUrl: string;
  stages: {
    stage: ReminderStage;
    dueAt: string;
    auto: { finishedAt: string | null; recipients: number; sent: number; failed: number } | null;
  }[];
  history: { kind: "manual" | "test"; stage: ReminderStage; at: string; recipients: number; sent: number; failed: number; to?: string }[];
  schedulerEnabled: boolean;
};

/** What the admin page shows. */
export async function reminderStatus(now = new Date()): Promise<ReminderStatus> {
  const session = reminderSession(now);
  const col = await collection();
  const records = session && col ? await col.find({ startsAt: session.startsAt }).sort({ claimedAt: -1 }).toArray() : [];
  const registrants = session ? (await recipientsFor(session)).length : 0;

  return {
    session: session
      ? {
          startsAt: session.startsAt,
          title: session.title,
          when: whenLabel(session),
          minutesUntilStart: Math.round((Date.parse(session.startsAt) - now.getTime()) / 60_000),
        }
      : null,
    registrants,
    meetUrl: SEMINAR_MEET_URL,
    stages: REMINDER_STAGES.map((stage) => {
      const auto = records.find((r) => r.kind === "auto" && r.stage === stage);
      return {
        stage,
        dueAt: session ? new Date(stageWindow(session, stage).from).toISOString() : "",
        auto: auto
          ? { finishedAt: auto.finishedAt?.toISOString() ?? null, recipients: auto.recipients, sent: auto.sent, failed: auto.failed }
          : null,
      };
    }),
    history: records
      .filter((r) => r.kind !== "auto")
      .slice(0, 10)
      .map((r) => ({
        kind: r.kind as "manual" | "test",
        stage: r.stage,
        at: (r.finishedAt ?? r.claimedAt).toISOString(),
        recipients: r.recipients,
        sent: r.sent,
        failed: r.failed,
        ...(r.to ? { to: r.to } : {}),
      })),
    schedulerEnabled: schedulerEnabled(),
  };
}

/** Automatic sends run in production unless switched off, and in development
 *  only when switched on — a dev server left running through 19:30 must never
 *  email sixty real people. */
export function schedulerEnabled(): boolean {
  const flag = process.env.SEMINAR_REMINDERS_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "production";
}
