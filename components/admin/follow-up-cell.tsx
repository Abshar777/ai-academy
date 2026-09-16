"use client";

import { useEffect, useRef, useState } from "react";
import type { FollowUpTarget, PlainFollowUp } from "@/lib/lead-followup";
import { Spinner } from "./spinner";

/**
 * Called / not called, and a note, on one lead.
 *
 * Optimistic: the pill flips the moment it is pressed and the note keeps what
 * was typed, because an admin working down a list of sixty should never wait
 * on a round trip. A failed write puts the old value back and says so rather
 * than leaving the screen claiming something the database does not hold.
 *
 * The note saves a second after typing stops, and immediately on blur, so
 * closing the page mid-sentence does not lose it.
 */

const SAVE_AFTER_MS = 1000;

export function FollowUpCell({
  target,
  initial,
}: {
  target: FollowUpTarget;
  initial: PlainFollowUp;
}) {
  const [called, setCalled] = useState(initial.called);
  const [note, setNote] = useState(initial.note);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedNote = useRef(initial.note);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function save(patch: { called?: boolean; note?: string }, revert: () => void) {
    setState("saving");
    try {
      const res = await fetch("/api/admin/leads/follow-up", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, ...patch }),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (patch.note !== undefined) savedNote.current = patch.note;
      setState("saved");
      window.setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1800);
    } catch {
      revert();
      setState("error");
    }
  }

  function toggle() {
    const next = !called;
    setCalled(next);
    void save({ called: next }, () => setCalled(!next));
  }

  function onNoteChange(value: string) {
    setNote(value);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (value !== savedNote.current) void save({ note: value }, () => setNote(savedNote.current));
    }, SAVE_AFTER_MS);
  }

  function onNoteBlur() {
    if (timer.current) window.clearTimeout(timer.current);
    if (note !== savedNote.current) void save({ note }, () => setNote(savedNote.current));
  }

  return (
    <div className="flex min-w-[230px] flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={called}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-noi-grotesk text-[12px] font-semibold tracking-[0.02em] transition-colors duration-150 ${
            called
              ? "bg-lime-30 text-neutral-90 hover:bg-lime-40"
              : "bg-neutral-90/8 text-neutral-50 hover:bg-neutral-90/15"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${called ? "bg-neutral-90" : "bg-neutral-50"}`}
          />
          {called ? "Called" : "Not called"}
        </button>
        {state === "saving" && <Spinner className="text-neutral-50" />}
        {state === "saved" && <span className="font-noi-grotesk text-[11px] text-[#5d7a00]">saved</span>}
        {state === "error" && <span className="font-noi-grotesk text-[11px] text-[#c0392b]">not saved</span>}
      </div>
      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        onBlur={onNoteBlur}
        rows={2}
        placeholder="Add a note…"
        aria-label="Note"
        className="w-full resize-y rounded-lg border border-neutral-90/15 bg-white px-2.5 py-1.5 font-noi-grotesk text-[13px] leading-[1.45] text-neutral-90 outline-none transition-colors duration-150 placeholder:text-neutral-50 focus:border-neutral-90"
      />
    </div>
  );
}
