"use client";

import { useEffect, useRef, useState } from "react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  type FollowUpTarget,
  type LeadStatus,
  type PlainFollowUp,
} from "@/lib/lead-status";
import { Spinner } from "./spinner";

/**
 * Called / not called, where the lead stands, and a note.
 *
 * Two separate things on purpose: the pill records whether anyone dialled, the
 * status records what came of it. A lead can be called twice and still be
 * waiting on a call back.
 *
 * Optimistic throughout: every control moves the moment it is used, because an
 * admin working down a list of sixty should never wait on a round trip. A
 * failed write puts the old value back and says so rather than leaving the
 * screen claiming something the database does not hold.
 *
 * The note saves a second after typing stops, and immediately on blur, so
 * closing the page mid-sentence does not lose it.
 */

const SAVE_AFTER_MS = 1000;

/** Each status carries its own colour, so a list can be read down at a glance
 *  rather than word by word. */
const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "border-neutral-90/15 bg-white text-neutral-50",
  interested: "border-transparent bg-lime-30 text-neutral-90",
  callback: "border-transparent bg-[#ffd8a8] text-[#7a4a00]",
  "not-interested": "border-transparent bg-[#f7d6d0] text-[#9c2c17]",
  enrolled: "border-transparent bg-neutral-90 text-white",
  unreachable: "border-transparent bg-neutral-90/10 text-neutral-70",
};

export function FollowUpCell({
  target,
  initial,
}: {
  target: FollowUpTarget;
  initial: PlainFollowUp;
}) {
  const [called, setCalled] = useState(initial.called);
  const [status, setStatus] = useState<LeadStatus>(initial.status);
  const [note, setNote] = useState(initial.note);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedNote = useRef(initial.note);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function save(
    patch: { called?: boolean; status?: LeadStatus; note?: string },
    revert: () => void,
  ) {
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

  function changeStatus(next: LeadStatus) {
    const previous = status;
    setStatus(next);
    // Choosing an outcome means somebody spoke to them, so the pill follows —
    // except "call back", which is exactly the case where they did not answer.
    const alsoCalled = !called && next !== "new" && next !== "callback";
    if (alsoCalled) setCalled(true);
    void save({ status: next, ...(alsoCalled ? { called: true } : {}) }, () => {
      setStatus(previous);
      if (alsoCalled) setCalled(false);
    });
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
    <div className="flex min-w-[260px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={called}
          title={called ? "Called — press to unmark" : "Not called yet — press when you have"}
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

        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value as LeadStatus)}
          aria-label="Lead status"
          className={`h-[26px] rounded-full border px-2.5 font-noi-grotesk text-[12px] font-semibold tracking-[0.02em] outline-none transition-colors duration-150 ${STATUS_STYLE[status]}`}
        >
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value} className="bg-white font-medium text-neutral-90">
              {LEAD_STATUS_LABEL[value]}
            </option>
          ))}
        </select>

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
