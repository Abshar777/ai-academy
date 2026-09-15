"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReminderStage, ReminderStatus } from "@/lib/seminar-reminders";

/**
 * Reminder emails for the next seminar: what has gone out, what is due, and a
 * button to send any of them now. The automatic sends happen on the server
 * (instrumentation.ts); this shows their trail and gives the admin the same
 * lever by hand, plus a test send so the email can be read before it reaches
 * everyone.
 */

const LABEL: Record<ReminderStage, string> = {
  30: "30 minutes before",
  15: "15 minutes before",
  5: "5 minutes before",
  3: "3 minutes before",
  0: "At the start",
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

const BTN =
  "inline-flex h-9 items-center rounded-full px-4 font-noi-grotesk text-[13px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export function SeminarReminders() {
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/seminar/reminders", { cache: "no-store" });
    if (res.ok) setStatus((await res.json()) as ReminderStatus);
  }, []);

  useEffect(() => {
    // Deferred a tick — the lint rule flags a setState the effect body can
    // reach synchronously, matching the pattern used elsewhere in admin.
    const id = window.setTimeout(() => void refresh(), 0);
    const every = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(every);
    };
  }, [refresh]);

  async function send(stage: ReminderStage, test: boolean) {
    if (!status) return;
    if (!test) {
      const ok = window.confirm(
        `Send the "${LABEL[stage]}" reminder to all ${status.registrants} registrants now?`,
      );
      if (!ok) return;
    }
    setBusy(`${stage}${test ? "-test" : ""}`);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/seminar/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, ...(test ? { testTo } : {}) }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; sent?: number; failed?: number; recipients?: number };
      if (data.error) setMessage({ tone: "warn", text: data.error });
      else
        setMessage({
          tone: data.failed ? "warn" : "ok",
          text: test
            ? `Test sent to ${testTo}.`
            : `Sent to ${data.sent} of ${data.recipients}${data.failed ? ` — ${data.failed} failed, see server logs` : ""}.`,
        });
      await refresh();
    } catch {
      setMessage({ tone: "warn", text: "Could not reach the server." });
    } finally {
      setBusy(null);
    }
  }

  if (!status) {
    return (
      <div className="rounded-2xl bg-white p-5 font-noi-grotesk text-[14px] text-neutral-50">Loading reminders…</div>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-noi-grotesk text-[15px] font-medium text-neutral-90">Reminder emails</h2>
          <p className="mt-0.5 font-noi-grotesk text-[13px] text-neutral-50">
            {status.session
              ? `${status.session.title} · ${status.session.when} · ${status.registrants} registered · ` +
                (status.session.minutesUntilStart > 0
                  ? `starts in ${status.session.minutesUntilStart} min`
                  : `started ${-status.session.minutesUntilStart} min ago`)
              : "No upcoming session."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 font-noi-grotesk text-[11px] font-bold tracking-[0.03em] ${
            status.schedulerEnabled ? "bg-lime-30 text-neutral-90" : "bg-neutral-90/10 text-neutral-70"
          }`}
        >
          {status.schedulerEnabled ? "AUTO ON" : "AUTO OFF"}
        </span>
      </div>

      <p className="font-noi-grotesk text-[13px] text-neutral-50">
        Meeting link:{" "}
        <a href={status.meetUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-90 underline underline-offset-2">
          {status.meetUrl}
        </a>
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse font-noi-grotesk text-[14px]">
          <thead>
            <tr className="border-b border-neutral-90/8 text-left text-neutral-50">
              <th className="px-3 py-2 font-medium">Reminder</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Automatic</th>
              <th className="px-3 py-2 text-right font-medium">Send by hand</th>
            </tr>
          </thead>
          <tbody>
            {status.stages.map((row) => (
              <tr key={row.stage} className="border-b border-neutral-90/6 last:border-0">
                <td className="px-3 py-2.5">{LABEL[row.stage]}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-neutral-50">{row.dueAt ? time(row.dueAt) : "—"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {row.auto ? (
                    <span className={row.auto.failed ? "text-[#c0392b]" : "text-[#5d7a00]"}>
                      sent {row.auto.finishedAt ? time(row.auto.finishedAt) : ""} · {row.auto.sent}/{row.auto.recipients}
                    </span>
                  ) : (
                    <span className="text-neutral-40">not yet</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    className={`${BTN} bg-neutral-90 text-white hover:bg-neutral-100`}
                    disabled={busy !== null || !status.session || status.registrants === 0}
                    onClick={() => void send(row.stage, false)}
                  >
                    {busy === String(row.stage) ? "Sending…" : "Send now"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-90/8 pt-4">
        <label className="font-noi-grotesk text-[13px] text-neutral-50" htmlFor="reminder-test-to">
          Send a test of the &ldquo;at the start&rdquo; email to
        </label>
        <input
          id="reminder-test-to"
          type="email"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="you@example.com"
          className="h-9 w-60 rounded-full border border-neutral-90/15 px-3.5 font-noi-grotesk text-[13px] outline-none focus:border-neutral-90"
        />
        <button
          type="button"
          className={`${BTN} border border-neutral-90/15 text-neutral-90 hover:border-neutral-90/40`}
          disabled={busy !== null || !status.session || !/^\S+@\S+\.\S+$/.test(testTo)}
          onClick={() => void send(0, true)}
        >
          {busy === "0-test" ? "Sending…" : "Send test"}
        </button>
      </div>

      {message && (
        <p className={`font-noi-grotesk text-[13px] ${message.tone === "ok" ? "text-[#5d7a00]" : "text-[#c0392b]"}`}>
          {message.text}
        </p>
      )}

      {status.history.length > 0 && (
        <ul className="flex flex-col gap-1 font-noi-grotesk text-[12px] text-neutral-50">
          {status.history.map((h, i) => (
            <li key={i}>
              {time(h.at)} · {h.kind === "test" ? `test to ${h.to}` : `manual, ${LABEL[h.stage].toLowerCase()}`} ·{" "}
              {h.sent}/{h.recipients} sent{h.failed ? `, ${h.failed} failed` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
