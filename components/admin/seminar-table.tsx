"use client";

import { DataTable, type Column } from "./data-table";
import { FollowUpCell } from "./follow-up-cell";
import { LEAD_STATUS_LABEL, type PlainFollowUp } from "@/lib/lead-status";

export type SeminarRow = {
  createdAt: string | number | Date;
  name?: string | null;
  email: string;
  phone?: string | null;
  country?: string | null;
  startsAt: string | number | Date;
  invited?: boolean;
  followUp: PlainFollowUp;
};

const dateTime = (value: SeminarRow["createdAt"]) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Matches formatWebinarDate's output without pulling a server helper into the
 *  client bundle — the session column only ever shows a date. */
const sessionDate = (value: SeminarRow["startsAt"]) =>
  new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });

const COLUMNS: Column<SeminarRow>[] = [
  {
    key: "registered",
    header: "Registered",
    className: "whitespace-nowrap text-neutral-50",
    cell: (row) => dateTime(row.createdAt),
    search: (row) => dateTime(row.createdAt),
  },
  { key: "name", header: "Name", cell: (row) => row.name || "—", search: (row) => row.name },
  { key: "email", header: "Email", cell: (row) => row.email, search: (row) => row.email },
  {
    key: "phone",
    header: "Phone",
    className: "whitespace-nowrap",
    cell: (row) => row.phone || "—",
    search: (row) => row.phone,
  },
  {
    key: "country",
    header: "Country",
    cell: (row) => row.country || "—",
    search: (row) => row.country,
  },
  {
    key: "session",
    header: "Session",
    className: "whitespace-nowrap text-neutral-50",
    cell: (row) => sessionDate(row.startsAt),
    search: (row) => sessionDate(row.startsAt),
  },
  {
    key: "invite",
    header: "Invite",
    cell: (row) =>
      row.invited ? (
        <span className="text-[#5d7a00]">sent</span>
      ) : (
        <span className="text-[#c0392b]">not sent</span>
      ),
    // Searchable so "not sent" narrows to the people still waiting on an invite.
    search: (row) => (row.invited ? "sent" : "not sent"),
  },
  {
    key: "followUp",
    header: "Follow-up",
    className: "align-top",
    cell: (row) => (
      <FollowUpCell
        target={{ kind: "seminar", email: row.email, startsAt: String(row.startsAt) }}
        initial={row.followUp}
      />
    ),
    // Searchable, so "not called" narrows the list to the people still owed a
    // call — which is the whole reason for the column.
    // "not called" contains "called", so each state also gets a word of its
    // own: "pending" finds only the uncalled, "done" only the called. The
    // status label is searchable too, so "Call back" lists everyone owed one.
    search: (row) =>
      `${row.followUp.called ? "called done" : "not called pending"} ` +
      `${LEAD_STATUS_LABEL[row.followUp.status]} ${row.followUp.note}`,
  },
];

export function SeminarTable({ rows }: { rows: SeminarRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      filterPlaceholder="Filter by name, email, country, called…"
      empty="No registrations yet."
      minWidth={1020}
      rowKey={(row) => `${row.email}|${String(row.startsAt)}`}
    />
  );
}
