import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

/**
 * Deleting a student's account and everything that lets them in.
 *
 * On its own, away from the read-only reporting in lib/watch-progress.ts,
 * because this is the only thing in the admin panel that destroys data. There
 * is no undo, no archive, no soft-delete flag: the rows are gone.
 *
 * Why this signs them out at once. The course API loads the user from the
 * database on every single request (academy-api/src/auth/middleware.ts) rather
 * than trusting the access token's contents, precisely so a deleted account
 * can't keep using a token that hasn't expired. Remove the row and the next
 * request they make — a page load, a progress ping, a request for a video
 * URL — answers 401 and the app sends them to sign in. A video already
 * playing in a tab keeps playing until it needs a fresh signed URL, which is a
 * matter of minutes; nothing can reach back into a running browser and stop a
 * frame that has already been delivered.
 *
 * The payment record is deliberately left alone. Access and accounting are
 * different questions: revoking someone's access shouldn't quietly rewrite
 * last month's revenue. Archive the enrolment in the payments table if it
 * should also leave the figures.
 */

const USERS = "users";
const PROGRESS = "progress";
const ENTITLEMENTS = "entitlements";
const SESSIONS = "sessions";
const DEVICES = "devices";
const HANDOFFS = "handoffs";
const OTPS = "otps";

export type DeletedCounts = {
  email: string;
  name: string | null;
  sessions: number;
  devices: number;
  entitlements: number;
  progress: number;
  handoffs: number;
  otps: number;
};

export type DeleteOutcome =
  | { ok: true; deleted: DeletedCounts }
  | { ok: false; error: string; status: number };

/**
 * Wipes the account, then everything hanging off it.
 *
 * The user row goes first on purpose. It is the row the auth middleware
 * checks, so removing it is what actually ends their access — and if this
 * process were to die halfway through, the half that has already happened is
 * the half that matters. Orphaned progress rows are untidy; an account that
 * survived a delete and kept its access is a real problem.
 *
 * `confirmEmail` has to match the account. The admin types it into the dialog,
 * so a mis-click on the wrong row in a table of eighty-odd people cannot
 * delete anyone: the id and the typed email have to agree.
 */
export async function deleteStudent(id: string, confirmEmail: string): Promise<DeleteOutcome> {
  if (!ObjectId.isValid(id)) {
    return { ok: false, error: "That isn't a student id.", status: 400 };
  }

  const db = await getDb();
  if (!db) return { ok: false, error: "The database isn't configured.", status: 503 };

  const userId = new ObjectId(id);
  const user = await db.collection<{ _id: ObjectId; email: string; name?: string }>(USERS).findOne({
    _id: userId,
  });
  if (!user) {
    return { ok: false, error: "That account has already gone.", status: 404 };
  }

  if (confirmEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return {
      ok: false,
      error: `That email doesn't match this account. Type ${user.email} to confirm.`,
      status: 400,
    };
  }

  await db.collection(USERS).deleteOne({ _id: userId });

  /* Everything else is cleanup, and none of it guards access any more.
     Settled together rather than in sequence so one slow collection doesn't
     hold the admin's request open. */
  const [sessions, devices, entitlements, progress, handoffs, otps] = await Promise.all([
    db.collection(SESSIONS).deleteMany({ userId }),
    db.collection(DEVICES).deleteMany({ userId }),
    db.collection(ENTITLEMENTS).deleteMany({ userId }),
    db.collection(PROGRESS).deleteMany({ userId }),
    db.collection(HANDOFFS).deleteMany({ userId }),
    // Sign-in codes are addressed to an email, not an account — a pending one
    // would otherwise let them straight back in to a freshly created account.
    db.collection(OTPS).deleteMany({ email: user.email }),
  ]);

  return {
    ok: true,
    deleted: {
      email: user.email,
      name: user.name?.trim() || null,
      sessions: sessions.deletedCount,
      devices: devices.deletedCount,
      entitlements: entitlements.deletedCount,
      progress: progress.deletedCount,
      handoffs: handoffs.deletedCount,
      otps: otps.deletedCount,
    },
  };
}

/**
 * Finds the account behind a payment row, for the delete button in the
 * payments table.
 *
 * Email is the only thing the two sides share, and they can disagree: edit the
 * address on an enrolment after the account was made and nothing links them
 * any more. A delete that silently found nothing would report success and
 * leave the student with full access, so this returns the ambiguity instead of
 * swallowing it, and the caller refuses out loud.
 */
export async function findStudentByEmail(
  email: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const db = await getDb();
  if (!db) return null;
  const user = await db
    .collection<{ _id: ObjectId; email: string; name?: string }>(USERS)
    .findOne({ email: email.trim().toLowerCase() });
  if (!user) return null;
  return { id: user._id.toHexString(), email: user.email, name: user.name?.trim() || null };
}
