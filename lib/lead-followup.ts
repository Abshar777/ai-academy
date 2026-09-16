import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import {
  LEAD_STATUSES,
  plainFollowUp,
  type FollowUpTarget,
  type LeadStatus,
  type PlainFollowUp,
} from "./lead-status";

/**
 * Writing follow-up state onto a lead: whether someone has called them, where
 * they stand, and a note.
 *
 * Kept on the lead's own document as a `followUp` sub-document rather than in
 * a table of its own, so the admin lists that already read enrolments and
 * seminar registrations show it with no second query. Absent means the
 * default — not called, status "new", nothing written — which is every lead
 * until an admin says otherwise.
 *
 * Server-only: this imports the Mongo driver. Anything a client component
 * needs — the statuses, their labels, the plain shapes — lives in
 * lead-status.ts, which imports nothing.
 */

const NOTE_LIMIT = 2000;

export async function setFollowUp(
  target: FollowUpTarget,
  patch: { called?: boolean; status?: LeadStatus; note?: string },
): Promise<{ ok: true; followUp: PlainFollowUp } | { ok: false; error: string; status: number }> {
  const db = await getDb();
  if (!db) return { ok: false, error: "MongoDB is not configured.", status: 503 };

  const set: Record<string, unknown> = { "followUp.updatedAt": new Date() };
  if (patch.called !== undefined) set["followUp.called"] = patch.called;
  if (patch.status !== undefined) {
    if (!LEAD_STATUSES.includes(patch.status)) {
      return { ok: false, error: "Unknown status.", status: 400 };
    }
    set["followUp.status"] = patch.status;
  }
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
