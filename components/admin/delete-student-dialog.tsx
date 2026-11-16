"use client";

import { useEffect, useState } from "react";
import type { StudentDetail } from "@/lib/watch-progress";

/**
 * The confirmation in front of the only irreversible thing the admin panel can
 * do.
 *
 * It opens on a lookup rather than on data the caller already has, and fetches
 * the account itself. That's what lets the payments table use it: a payment row
 * knows an email, and whether an account answers to that email is the first
 * thing this has to find out. When none does, the dialog says so and offers no
 * button — a delete that quietly matched nothing would look like it had worked
 * and leave the student watching.
 *
 * The admin types the email to confirm. The id and the typed address both
 * travel to the server and have to agree there too, so the wrong row in a long
 * table can't delete the wrong person.
 */
export function DeleteStudentDialog({
  lookup,
  onClose,
  onDeleted,
}: {
  lookup: { id: string } | { email: string };
  onClose: () => void;
  onDeleted: (email: string) => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = "id" in lookup ? `id=${encodeURIComponent(lookup.id)}` : `email=${encodeURIComponent(lookup.email)}`;

  useEffect(() => {
    let cancelled = false;
    /* No reset of detail/loadError first: this dialog is mounted for one
       lookup and unmounted again, so there is never stale state to clear —
       and clearing it synchronously here is a cascading render. */
    (async () => {
      try {
        const res = await fetch(`/api/admin/students/detail?${query}`);
        const data = (await res.json()) as StudentDetail & { error?: string };
        if (cancelled) return;
        if (!res.ok) setLoadError(data.error ?? "Couldn't load that account.");
        else setDetail(data);
      } catch {
        if (!cancelled) setLoadError("Couldn't reach the server.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const student = detail?.student;
  const matches = Boolean(student) && typed.trim().toLowerCase() === student!.email.toLowerCase();

  async function confirmDelete() {
    if (!student || !matches) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, confirmEmail: typed.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That didn't work.");
      onDeleted(student.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-90/55 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete student"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        {!detail && !loadError && (
          <p className="px-5 py-8 text-center font-noi-grotesk text-[14px] text-neutral-50">
            Looking up the account…
          </p>
        )}

        {loadError && (
          <div className="flex flex-col gap-4 p-5">
            <p className="font-noi-grotesk text-[15px] font-medium text-neutral-90">
              No account to delete
            </p>
            <p role="alert" className="font-noi-grotesk text-[13px] leading-relaxed text-neutral-70">
              {loadError}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="self-end rounded-full border border-neutral-90/15 px-4 py-1.5 font-noi-grotesk text-[13px] transition-colors duration-150 hover:bg-neutral-90/6"
            >
              Close
            </button>
          </div>
        )}

        {student && (
          <div className="flex flex-col gap-3 p-5">
            <div>
              <p className="font-noi-grotesk text-[15px] font-medium text-neutral-90">
                Delete {student.name || student.email}?
              </p>
              <p className="mt-1 font-noi-grotesk text-[13px] leading-relaxed text-neutral-70">
                They&rsquo;re signed out within seconds and lose access to every class. This
                can&rsquo;t be undone.
              </p>
            </div>

            <ul className="flex flex-col gap-1 rounded-xl bg-neutral-10 px-3.5 py-3 font-noi-grotesk text-[13px] text-neutral-70">
              <li className="text-[11px] tracking-wide text-neutral-50 uppercase">
                Permanently removed
              </li>
              <li>
                Account &middot; <span className="text-neutral-90">{student.email}</span>
              </li>
              <li>
                {detail.sessions} sign-in{detail.sessions === 1 ? "" : "s"}, {detail.devices} device
                {detail.devices === 1 ? "" : "s"},{" "}
                {student.entitled ? "their course access" : "no course access"}
              </li>
              <li>
                {student.started} watch record{student.started === 1 ? "" : "s"}
                {student.finished > 0 && ` (${student.finished} finished)`}
              </li>
              <li className="text-neutral-50">The payment record is kept for the books</li>
            </ul>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm-delete-email"
                className="font-noi-grotesk text-[13px] text-neutral-70"
              >
                Type <span className="text-neutral-90">{student.email}</span> to confirm
              </label>
              <input
                id="confirm-delete-email"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="h-10 rounded-xl border border-neutral-90/15 px-3 font-noi-grotesk text-[14px] text-neutral-90 outline-none focus:border-neutral-90/40"
              />
            </div>

            {error && (
              <p role="alert" className="font-noi-grotesk text-[13px] text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-90/15 px-4 py-1.5 font-noi-grotesk text-[13px] transition-colors duration-150 hover:bg-neutral-90/6"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!matches || busy}
                className="rounded-full bg-red-600 px-4 py-1.5 font-noi-grotesk text-[13px] font-medium text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-30"
              >
                {busy ? "Deleting…" : "Delete for good"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
