import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import { createHash } from "node:crypto";
import {
  createSeminarEvent,
  getSeminarEvent,
  isCalendarConfigured,
  updateSeminarEvent,
} from "./google-calendar";
import { WEBINAR_TIME_ZONE, type WebinarSession } from "./next-webinar";
import type { InviteContent } from "./seminar-invite";

/**
 * Who booked a seat at a free seminar, and which Google Calendar event each
 * session is running on.
 *
 * Two collections rather than one. Registrations are per person; the calendar
 * event is per session and shared by everyone on it, so it needs somewhere of
 * its own to live — otherwise the first registrant's row would be the one
 * holding the event id everyone else depends on.
 *
 * Mongo missing means "skip", not "throw": the same rule the rest of lib/
 * follows. Someone should never be told a free seminar is full because a
 * database is down.
 */

export type SeminarRegistration = {
  name: string;
  email: string;
  phone: string;
  country: string;
  /** Which session, as the ISO instant from lib/next-webinar.ts. */
  startsAt: string;
  /** Whether Google accepted them onto the event and sent the invitation. */
  invited: boolean;
  createdAt: Date;
};

type SeminarSession = {
  startsAt: string;
  eventId?: string;
  meetLink?: string | null;
  /** Fingerprint of the wording last written to the event, so corrected copy
   *  reaches an invitation people already hold instead of only the next one. */
  contentHash?: string;
  createdAt: Date;
};

const REGISTRATIONS = "seminar_registrations";
const SESSIONS = "seminar_sessions";

let indexesEnsured = false;

async function collections(): Promise<{
  registrations: Collection<SeminarRegistration>;
  sessions: Collection<SeminarSession>;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const registrations = db.collection<SeminarRegistration>(REGISTRATIONS);
  const sessions = db.collection<SeminarSession>(SESSIONS);

  if (!indexesEnsured) {
    indexesEnsured = true;
    await Promise.all([
      // One seat per person per session. Someone submitting the form twice
      // updates their details rather than turning into two registrations.
      registrations
        .createIndex({ email: 1, startsAt: 1 }, { unique: true, name: "one_seat_per_session" })
        .catch((err) => console.error("[seminar] could not create the seat index", err)),
      // The lock that stops two simultaneous registrations creating two
      // calendar events for the same session — see sessionEvent below.
      sessions
        .createIndex({ startsAt: 1 }, { unique: true, name: "one_event_per_session" })
        .catch((err) => console.error("[seminar] could not create the session index", err)),
    ]);
  }
  return { registrations, sessions };
}

/**
 * The calendar event for a session, created on first use.
 *
 * The insert is the lock. Its unique index means exactly one caller can create
 * the session row, and that caller is the one that talks to Google; everyone
 * else loses the insert and reads the event back instead. Without it, two
 * people registering in the same second would each make their own event and
 * half the guests would be invited to the wrong one.
 */
export async function sessionEvent(
  session: WebinarSession,
  content: InviteContent,
): Promise<{ eventId: string; meetLink: string | null } | null> {
  if (!isCalendarConfigured()) return null;
  const db = await collections();
  if (!db) return null;

  const hash = createHash("sha256")
    .update(`${content.title}\u0000${content.description}\u0000${content.location ?? ""}`)
    .digest("hex");

  const existing = await db.sessions.findOne({ startsAt: session.startsAt });
  if (existing?.eventId) {
    // The event outlives the registration that created it, so corrected
    // wording has to be pushed to it rather than waiting for a new event.
    if (existing.contentHash !== hash) {
      const updated = await updateSeminarEvent(existing.eventId, content);
      if (updated) {
        await db.sessions.updateOne({ startsAt: session.startsAt }, { $set: { contentHash: hash } });
      }
    }
    return { eventId: existing.eventId, meetLink: existing.meetLink ?? null };
  }

  let weCreate = false;
  try {
    await db.sessions.insertOne({ startsAt: session.startsAt, createdAt: new Date() });
    weCreate = true;
  } catch (err) {
    // 11000 — someone else got there first and is talking to Google now.
    if (!(typeof err === "object" && err !== null && (err as { code?: number }).code === 11000)) {
      console.error("[seminar] could not claim the session", err);
      return null;
    }
  }

  if (weCreate) {
    const event = await createSeminarEvent({
      title: content.title,
      description: content.description,
      location: content.location,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
      timeZone: WEBINAR_TIME_ZONE,
    });
    if (!event) {
      // Release the claim, so the next registration retries rather than
      // inheriting a session row that will never have an event.
      await db.sessions.deleteOne({ startsAt: session.startsAt, eventId: { $exists: false } });
      return null;
    }
    await db.sessions.updateOne(
      { startsAt: session.startsAt },
      { $set: { eventId: event.eventId, meetLink: event.meetLink, contentHash: hash } },
    );
    return event;
  }

  // Lost the race. The winner is mid-call to Google, so wait briefly for the
  // event id to land rather than failing this registration outright.
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const row = await db.sessions.findOne({ startsAt: session.startsAt });
    if (row?.eventId) return { eventId: row.eventId, meetLink: row.meetLink ?? null };
  }
  console.error("[seminar] timed out waiting for another request to create the session event");
  return null;
}

/**
 * The Google event id for a session, if one has been created yet.
 *
 * Read-only on purpose: the public .ics route must not be able to create a
 * calendar event, or a stranger fetching the file would provision one.
 */
export async function sessionEventId(startsAt: string): Promise<string | null> {
  const db = await collections();
  if (!db) return null;
  const row = await db.sessions.findOne({ startsAt });
  return row?.eventId ?? null;
}

/** Re-reads the Meet link from Google, for a session whose event we already
 *  hold. Used when the stored link is missing. */
export async function refreshSessionMeetLink(startsAt: string, eventId: string): Promise<string | null> {
  const event = await getSeminarEvent(eventId);
  if (!event?.meetLink) return null;
  const db = await collections();
  await db?.sessions.updateOne({ startsAt }, { $set: { meetLink: event.meetLink } });
  return event.meetLink;
}

/**
 * Records a seat. Returns whether this was a new registration, so the caller
 * fires the invitation and the welcome message once rather than every time
 * someone resubmits the form.
 */
export async function recordSeminarRegistration(
  data: Omit<SeminarRegistration, "createdAt" | "invited">,
): Promise<{ created: boolean }> {
  try {
    const db = await collections();
    if (!db) {
      console.info("[seminar] MongoDB not configured — not recording", data.email);
      return { created: false };
    }
    const result = await db.registrations.updateOne(
      { email: data.email, startsAt: data.startsAt },
      {
        // Details are refreshed on a resubmit — someone correcting a typo in
        // their phone number should see the correction stick — while
        // createdAt and invited keep the original registration's history.
        $set: { name: data.name, phone: data.phone, country: data.country },
        $setOnInsert: { email: data.email, startsAt: data.startsAt, invited: false, createdAt: new Date() },
      },
      { upsert: true },
    );
    return { created: result.upsertedCount > 0 };
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return { created: false };
    }
    console.error("[seminar] could not record the registration", err);
    return { created: false };
  }
}

export async function markSeminarInvited(email: string, startsAt: string): Promise<void> {
  const db = await collections();
  await db?.registrations.updateOne({ email, startsAt }, { $set: { invited: true } });
}

/** Newest first, for the admin view. Null when Mongo isn't configured, so the
 *  caller can say "no database" rather than "no registrations". */
export async function listSeminarRegistrations(limit = 500): Promise<SeminarRegistration[] | null> {
  const db = await getDb();
  if (!db) return null;
  return db
    .collection<SeminarRegistration>(REGISTRATIONS)
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function countSeminarRegistrations(startsAt?: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  return db
    .collection<SeminarRegistration>(REGISTRATIONS)
    .countDocuments(startsAt ? { startsAt } : {});
}
