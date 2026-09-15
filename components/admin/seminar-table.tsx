"use client";

import { DataTable, type Column } from "./data-table";

export type SeminarRow = {
  createdAt: string | number | Date;
  name?: string | null;
  email: string;
  phone?: string | null;
  country?: string | null;
  startsAt: string | number | Date;
  invited?: boolean;
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
];

export function SeminarTable({ rows }: { rows: SeminarRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      filterPlaceholder="Filter by name, email, country…"
      empty="No registrations yet."
      minWidth={760}
    />
  );
}
