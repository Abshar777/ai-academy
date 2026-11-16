"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column, type Facet } from "./data-table";
import { DeleteStudentDialog } from "./delete-student-dialog";
import {
  WATCH_STATES,
  WATCH_STATE_LABEL,
  formatDuration,
  percentOf,
  type StudentDetail,
  type StudentRow,
  type WatchReport,
  type WatchState,
} from "@/lib/watch-states";

const STATE_CLASS: Record<WatchState, string> = {
  finished: "bg-lime-30/40 text-neutral-90",
  watching: "bg-neutral-90/8 text-neutral-70",
  stalled: "bg-amber-100 text-amber-800",
  never: "bg-red-100 text-red-700",
};

function StatePill({ state }: { state: WatchState }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-noi-grotesk text-[12px] whitespace-nowrap ${STATE_CLASS[state]}`}
    >
      {WATCH_STATE_LABEL[state]}
    </span>
  );
}

/** A plain track and fill. Monochrome on purpose: the pill beside it already
 *  carries the colour, and a row of coloured bars reads as a chart nobody
 *  asked for. */
function Bar({ percent }: { percent: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-neutral-90/10">
      <span
        className="block h-full rounded-full bg-neutral-90"
        style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
      />
    </span>
  );
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

function Metric({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="font-noi-grotesk text-[13px] text-neutral-50">{label}</p>
      <p
        className={`mt-0.5 font-noi-grotesk text-[22px] font-medium tracking-[-0.02em] ${
          tone === "danger" ? "text-red-600" : "text-neutral-90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function StudentsTable({ report }: { report: WatchReport }) {
  const router = useRouter();
  const [opened, setOpened] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);

  const total = report.course.episodes;

  const columns = useMemo<Column<StudentRow>[]>(
    () => [
      {
        key: "student",
        header: "Student",
        cell: (row) => (
          <span className="block min-w-0">
            <span className="block truncate text-neutral-90">{row.name || "—"}</span>
            <span className="block truncate font-noi-grotesk text-[12px] text-neutral-50">
              {row.email}
            </span>
          </span>
        ),
        search: (row) => `${row.name ?? ""} ${row.email} ${row.phone ?? ""}`,
      },
      {
        key: "progress",
        header: "Classes finished",
        cell: (row) => (
          <span className="flex items-center gap-2.5">
            <span className="w-24 shrink-0">
              <Bar percent={total > 0 ? Math.round((row.finished / total) * 100) : 0} />
            </span>
            <span className="shrink-0 font-noi-grotesk text-[13px] whitespace-nowrap text-neutral-50">
              {row.finished}/{total}
            </span>
          </span>
        ),
        search: (row) => `${row.finished} finished`,
      },
      {
        key: "started",
        header: "Opened",
        className: "whitespace-nowrap text-neutral-50",
        cell: (row) => (row.started === 0 ? "—" : `${row.started}`),
      },
      {
        key: "reached",
        header: "Reached",
        className: "whitespace-nowrap text-neutral-50",
        cell: (row) => (row.furthestSec === 0 ? "—" : formatDuration(row.furthestSec)),
      },
      {
        key: "state",
        header: "State",
        cell: (row) => <StatePill state={row.state} />,
        search: (row) => WATCH_STATE_LABEL[row.state],
      },
      {
        key: "lastSeen",
        header: "Last watched",
        className: "whitespace-nowrap text-neutral-50",
        cell: (row) => (row.lastSeenAt ? shortDate(row.lastSeenAt) : "—"),
      },
      {
        key: "actions",
        header: "",
        className: "whitespace-nowrap text-right",
        cell: (row) => (
          <button
            id={`student-${row.id}`}
            type="button"
            onClick={() => setOpened(row)}
            className="rounded-full border border-neutral-90/15 px-3 py-1 font-noi-grotesk text-[13px] text-neutral-70 transition-colors duration-150 hover:border-neutral-90/40 hover:text-neutral-90"
          >
            Classes
          </button>
        ),
      },
    ],
    [total],
  );

  const facets = useMemo<Facet<StudentRow>[]>(
    () => [
      {
        key: "state",
        label: "Any progress",
        options: WATCH_STATES.map((value) => ({ value, label: WATCH_STATE_LABEL[value] })),
        valueOf: (row) => row.state,
      },
      {
        key: "access",
        label: "Any access",
        options: [
          { value: "yes", label: "Has course access" },
          { value: "no", label: "No access granted" },
        ],
        valueOf: (row) => (row.entitled ? "yes" : "no"),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Accounts" value={String(report.counts.total)} />
        <Metric
          label="Have started"
          value={String(report.counts.total - report.counts.never)}
        />
        <Metric label="Never watched" value={String(report.counts.never)} tone="danger" />
        <Metric label="Finished all" value={String(report.counts.finished)} />
      </div>

      {deleted && (
        <p
          role="status"
          className="rounded-2xl bg-white px-4 py-3 font-noi-grotesk text-[14px] text-neutral-90"
        >
          {deleted} is deleted. They&rsquo;re signed out and have no access.
        </p>
      )}

      {report.unmatchedEnrollments > 0 && (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 font-noi-grotesk text-[13px] leading-relaxed text-amber-800">
          {report.unmatchedEnrollments} payment{report.unmatchedEnrollments === 1 ? "" : "s"} in{" "}
          <Link href="/admin/payments" className="underline">
            Payments
          </Link>{" "}
          {report.unmatchedEnrollments === 1 ? "uses an email that no" : "use emails that no"}{" "}
          account has, so {report.unmatchedEnrollments === 1 ? "it isn't" : "they aren't"} in this
          list. Someone who paid may have signed up under a different address.
        </p>
      )}

      <DataTable
        rows={report.students}
        columns={columns}
        facets={facets}
        filterPlaceholder="Search name, email, phone…"
        empty="No accounts yet."
        minWidth={980}
        rowKey={(row) => row.id}
      />

      {opened && (
        <StudentPanel
          row={opened}
          totalEpisodes={total}
          onClose={() => setOpened(null)}
          onDelete={() => {
            setDeleting(opened);
            setOpened(null);
          }}
        />
      )}

      {deleting && (
        <DeleteStudentDialog
          lookup={{ id: deleting.id }}
          onClose={() => setDeleting(null)}
          onDeleted={(email) => {
            setDeleting(null);
            setDeleted(email);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * One student's course, episode by episode.
 *
 * The empty rows are the useful part: a list of what they finished would be
 * shorter, but it wouldn't show you where someone stopped. Fetched on open
 * rather than sent with the page — thirty-four episodes for eighty-odd
 * accounts is a payload nobody reads most of.
 */
function StudentPanel({
  row,
  totalEpisodes,
  onClose,
  onDelete,
}: {
  row: StudentRow;
  totalEpisodes: number;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/students/detail?id=${encodeURIComponent(row.id)}`);
        const data = (await res.json()) as StudentDetail & { error?: string };
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Couldn't load that student.");
        else setDetail(data);
      } catch {
        if (!cancelled) setError("Couldn't reach the server.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-90/55 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Classes watched by ${row.name || row.email}`}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-90/10 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-noi-grotesk text-[15px] text-neutral-90">
              {row.name || row.email}
            </p>
            <p className="mt-0.5 truncate font-noi-grotesk text-[13px] text-neutral-50">
              {row.email}
              {row.phone ? ` · ${row.phone}` : ""} · joined {shortDate(row.joinedAt)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <StatePill state={row.state} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-90/15 px-3.5 py-1.5 font-noi-grotesk text-[13px] leading-none transition-colors duration-150 hover:bg-neutral-90/6"
            >
              Close
            </button>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!detail && !error && (
            <p className="py-6 text-center font-noi-grotesk text-[14px] text-neutral-50">Loading…</p>
          )}
          {error && (
            <p role="alert" className="py-6 text-center font-noi-grotesk text-[14px] text-red-600">
              {error}
            </p>
          )}

          {detail && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Finished" value={`${detail.student.finished}/${totalEpisodes}`} />
                <Metric label="Opened" value={String(detail.student.started)} />
                <Metric label="Reached" value={formatDuration(detail.student.furthestSec)} />
                <Metric
                  label="Signed in on"
                  value={`${detail.devices} device${detail.devices === 1 ? "" : "s"}`}
                />
              </div>

              <ol className="flex flex-col">
                {detail.episodes.map((episode, index) => {
                  const percent = percentOf(episode.positionSec, episode.durationSec);
                  const untouched = episode.positionSec === 0;
                  return (
                    <li
                      key={episode.id}
                      className="flex items-center gap-3 border-t border-neutral-90/8 py-2.5 first:border-t-0"
                    >
                      <span className="w-6 shrink-0 font-noi-grotesk text-[12px] text-neutral-50">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate font-noi-grotesk text-[14px] ${
                            untouched ? "text-neutral-50" : "text-neutral-90"
                          }`}
                        >
                          {episode.title}
                        </span>
                        <span className="mt-1 block">
                          <Bar percent={percent} />
                        </span>
                      </span>
                      <span className="w-28 shrink-0 text-right font-noi-grotesk text-[12px] whitespace-nowrap text-neutral-50">
                        {untouched
                          ? "not opened"
                          : episode.completed
                            ? `finished · ${formatDuration(episode.durationSec)}`
                            : `${percent}% · ${formatDuration(episode.positionSec)}`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-90/10 px-5 py-3">
          <p className="font-noi-grotesk text-[12px] text-neutral-50">
            Positions are the furthest point reached, not time spent watching.
          </p>
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-full border border-red-600/30 px-3.5 py-1.5 font-noi-grotesk text-[13px] text-red-600 transition-colors duration-150 hover:bg-red-50"
          >
            Delete student
          </button>
        </div>
      </div>
    </div>
  );
}
