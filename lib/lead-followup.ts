import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

/**
 * Follow-up state on a lead: whether someone has called them, and a note.
 *
 * Kept on the lead's own document as a `followUp` sub-document rather than in
 * a table of its own, so the admin lists that already read enrolments and
 * seminar registrations show it with no second query. Absent means the
 * default — not called, nothing written — which is every lead until an admin
 * says otherwise.
 *
 * Two kinds of lead, addressed the way each collection is keyed: an enrolment
 * by its id, a seminar registration by email and session (its unique index).
 */

export type FollowUp = {
  called: boolean;
  note: string;
  updatedAt: Date;
};

export type FollowUpTarget =
  | { kind: "enrollment"; id: string }
  | { kind: "seminar"; email: string; startsAt: string };

/** What a page hands a client component: plain values, nothing from Mongo. */
export type PlainFollowUp = { called: boolean; note: string; updatedAt: string | null };

const NOTE_LIMIT = 2000;

export function plainFollowUp(value: unknown): PlainFollowUp {
  const raw = (value ?? {}) as Partial<FollowUp>;
  return {
    called: raw.called === true,
    note: typeof raw.note === "string" ? raw.note : "",
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
  };
}

export async function setFollowUp(
  target: FollowUpTarget,
  patch: { called?: boolean; note?: string },
): Promise<{ ok: true; followUp: PlainFollowUp } | { ok: false; error: string; status: number }> {
  const db = await getDb();
  if (!db) return { ok: false, error: "MongoDB is not configured.", status: 503 };

  const set: Record<string, unknown> = { "followUp.updatedAt": new Date() };
  if (patch.called !== undefined) set["followUp.called"] = patch.called;
  if (patch.note !== undefined) set["followUp.note"] = patch.note.slice(0, NOTE_LIMIT);

  let collection: string;
  let filter: Record<string, unknown>;
  if (target.kind === "enrollment") {
    if (!ObjectId.isValid(target.id)) return { ok: false, error: "Unknown enrolment.", status: 400 };
    collection = "enrollments";
    filter = { _id: new ObjectId(target.id) };
  } else {
    collection = "seminar_registrations";
    filter = { email: target.email, startsAt: target.startsAt };
  }

  const result = await db.collection(collection).updateOne(filter, { $set: set });
  if (result.matchedCount === 0) return { ok: false, error: "That lead no longer exists.", status: 404 };

  const doc = await db.collection(collection).findOne(filter, { projection: { followUp: 1 } });
  return { ok: true, followUp: plainFollowUp(doc?.followUp) };
}
