/**
 * The vocabulary of lead follow-up: statuses, labels, and the shapes that
 * cross between server and client.
 *
 * Deliberately free of imports. Its twin, lead-followup.ts, talks to Mongo,
 * and a client component importing a *value* from there — a label map, say —
 * pulls the whole driver into the browser bundle and the build fails on
 * `child_process`. Types alone were fine, because they are erased; constants
 * are not. Everything a table or a cell needs lives here instead.
 */

/**
 * Where a lead stands. Not a synonym for `called`: that records whether anyone
 * dialled, this records what came of it, and a lead can be called twice and
 * still be waiting on a call back.
 *
 * "new" is the absence of a decision, so it is the default and is never
 * written — a lead nobody has judged yet is new.
 */
export const LEAD_STATUSES = [
  "new",
  "interested",
  "callback",
  "not-interested",
  "enrolled",
  "unreachable",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  interested: "Interested",
  callback: "Call back",
  "not-interested": "Not interested",
  enrolled: "Enrolled",
  unreachable: "Unreachable",
};

/** As stored on the lead. */
export type FollowUp = {
  called: boolean;
  status: LeadStatus;
  note: string;
  updatedAt: Date;
};

/** Which lead, addressed the way each collection is keyed: an enrolment by its
 *  id, a seminar registration by email and session. */
export type FollowUpTarget =
  | { kind: "enrollment"; id: string }
  | { kind: "seminar"; email: string; startsAt: string };

/** What a page hands a client component: plain values, nothing from Mongo. */
export type PlainFollowUp = {
  called: boolean;
  status: LeadStatus;
  note: string;
  updatedAt: string | null;
};

/** Normalises whatever is on the document — including nothing at all, which is
 *  every lead until an admin touches one. */
export function plainFollowUp(value: unknown): PlainFollowUp {
  const raw = (value ?? {}) as Partial<FollowUp>;
  return {
    called: raw.called === true,
    status: LEAD_STATUSES.includes(raw.status as LeadStatus) ? (raw.status as LeadStatus) : "new",
    note: typeof raw.note === "string" ? raw.note : "",
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
  };
}
