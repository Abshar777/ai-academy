import { ObjectId } from "mongodb";
import type { Collection, Filter, WithId } from "mongodb";
import { getDb } from "./mongodb";

/**
 * Every email this project sends, recorded.
 *
 * Before this, a send returned `{ sent: boolean }` and the reason it failed
 * went to console.error on whichever box happened to be running — so "I never
 * got the code" had no answer but a shrug. This is that answer: what was sent,
 * to whom, what it said, and if it failed, why.
 *
 * Written by both services into one collection. The course API
 * (academy-api/src/email/log.ts) has its own small writer against the same
 * database and the same shape; `service` says which one put the row there.
 * They are deliberately separate files rather than a shared import — the two
 * deploy on their own cycles, and a shared module would couple them.
 */

export const EMAIL_LOG = "email_log";

/* The vocabulary lives in lib/email-kinds.ts, which imports nothing — see the
   note there. Re-exported so server code has one import, while the admin
   table takes the labels straight from that file and leaves the MongoDB
   driver on this side of the boundary. */
export type { EmailKind, EmailStatus } from "./email-kinds";
export { EMAIL_KIND_LABEL, canResend } from "./email-kinds";

import type { EmailKind, EmailStatus } from "./email-kinds";

/**
 * What was attached, as a recipe rather than the bytes.
 *
 * A resend rebuilds from this. Storing the PDFs themselves would put a few
 * hundred KB in every invoice row for a file that is cheaper to regenerate
 * than to read back — the brochure is on disk, and the invoice is derived
 * from figures already in the row. The calendar file is the exception: it is
 * a few hundred bytes of text and cannot be rebuilt without the whole event,
 * so it is kept verbatim.
 */
export type EmailAttachmentRef =
  | { kind: "brochure"; filename: string }
  | {
      kind: "invoice";
      filename: string;
      invoice: {
        name: string;
        email: string;
        amountMinorUnits: number;
        currency: string;
        paymentId: string;
        orderId: string;
        date: string;
      };
    }
  | { kind: "ics"; filename: string; content: string };

/**
 * A stored body can be large — the welcome email carries the entire
 * curriculum inline. This is well above anything the templates produce and
 * well below Mongo's 16MB document limit, so it only ever catches something
 * that has gone wrong.
 */
const MAX_BODY_CHARS = 400_000;

export type EmailLogEntry = {
  kind: EmailKind;
  to: string;
  subject: string;
  status: EmailStatus;
  /** Why it failed, verbatim from the transport. */
  error?: string;
  /** Which mailbox it went out through, where there is more than one. */
  mailbox?: string;
  /** The rendered HTML, as the recipient would have seen it. */
  bodyHtml?: string;
  attachments?: EmailAttachmentRef[];
  /** Whatever the email was about, so a row can be traced back. */
  enrollmentId?: string;
  orderId?: string;
  paymentId?: string;
  service: "web" | "api";
  /** Set on the row a resend creates, pointing at the row it was sent from.
   *  The original is never modified — an audit log that rewrites itself is
   *  not one. */
  resentFrom?: ObjectId;
  createdAt: Date;
};

let indexesEnsured = false;

async function collection(): Promise<Collection<EmailLogEntry> | null> {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<EmailLogEntry>(EMAIL_LOG);
  if (!indexesEnsured) {
    indexesEnsured = true;
    // Newest first is the only order this is ever read in; the rest are what
    // the admin filters narrow by.
    void coll.createIndex({ createdAt: -1 }).catch(() => {});
    void coll.createIndex({ to: 1, createdAt: -1 }).catch(() => {});
    void coll.createIndex({ kind: 1, createdAt: -1 }).catch(() => {});
    void coll.createIndex({ status: 1, createdAt: -1 }).catch(() => {});
  }
  return coll;
}

/**
 * Records one send. Never throws and never rejects.
 *
 * This sits inside the send path, so anything it does wrong would turn a
 * delivered email into a failed request. A log that loses a row is a nuisance;
 * a log that loses the email is a bug.
 */
export async function logEmail(
  entry: Omit<EmailLogEntry, "createdAt" | "service"> & {
    createdAt?: Date;
    service?: "web" | "api";
  },
): Promise<void> {
  try {
    const coll = await collection();
    if (!coll) return;
    const body = entry.bodyHtml;
    await coll.insertOne({
      ...entry,
      bodyHtml: body && body.length > MAX_BODY_CHARS ? body.slice(0, MAX_BODY_CHARS) : body,
      service: entry.service ?? "web",
      createdAt: entry.createdAt ?? new Date(),
    });
  } catch (err) {
    console.error("[email-log] could not record", entry.kind, "to", entry.to, err);
  }
}

export type EmailLogQuery = {
  limit?: number;
  kind?: EmailKind | null;
  status?: EmailStatus | null;
  /** Matches the recipient address, case-insensitively. */
  search?: string | null;
};

/** Null when MongoDB isn't configured, matching listEnrollments. */
export async function listEmailLog(
  query: EmailLogQuery = {},
): Promise<WithId<EmailLogEntry>[] | null> {
  const coll = await collection();
  if (!coll) return null;

  const filter: Filter<EmailLogEntry> = {};
  if (query.kind) filter.kind = query.kind;
  if (query.status) filter.status = query.status;
  if (query.search?.trim()) {
    // Escaped before it reaches the regex: an address is user input, and a
    // stray "(" from a paste would otherwise throw rather than find nothing.
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.to = { $regex: safe, $options: "i" };
  }

  return coll
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(query.limit ?? 200, 1), 1000))
    .toArray();
}

export async function getEmailLogEntry(id: string): Promise<WithId<EmailLogEntry> | null> {
  if (!ObjectId.isValid(id)) return null;
  const coll = await collection();
  if (!coll) return null;
  return coll.findOne({ _id: new ObjectId(id) });
}

/** Counts per status, for the summary strip above the table. */
export async function getEmailLogStats(): Promise<Record<EmailStatus, number> | null> {
  const coll = await collection();
  if (!coll) return null;
  const rows = await coll
    .aggregate<{ _id: EmailStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }])
    .toArray();
  const out: Record<EmailStatus, number> = { sent: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    if (row._id in out) out[row._id] = row.n;
  }
  return out;
}
