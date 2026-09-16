"use client";

import { useMemo } from "react";
import { DataTable, type Column, type Facet } from "./data-table";
import { FollowUpCell } from "./follow-up-cell";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type PlainFollowUp } from "@/lib/lead-status";

export type PaymentRow = {
  /** The enrolment's own id — how a follow-up note is addressed back to it. */
  id: string;
  createdAt: string | number | Date;
  name?: string | null;
  email: string;
  phone?: string | null;
  amountMinorUnits: number;
  currency: string;
  source: string;
  couponCode?: string | null;
  followUp: PlainFollowUp;
};

const title = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

function formatAmount(amountMinorUnits: number, currency: string) {
  if (amountMinorUnits === 0) return "Free";
  return `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
}

const COLUMNS: Column<PaymentRow>[] = [
  {
    key: "date",
    header: "Date",
    className: "whitespace-nowrap text-neutral-50",
    cell: (row) =>
      new Date(row.createdAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    search: (row) =>
      new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
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
    key: "amount",
    header: "Amount",
    className: "whitespace-nowrap",
    cell: (row) => formatAmount(row.amountMinorUnits, row.currency),
    search: (row) => formatAmount(row.amountMinorUnits, row.currency),
  },
  {
    key: "source",
    header: "Source",
    className: "capitalize",
    cell: (row) => row.source,
    search: (row) => row.source,
  },
  {
    key: "coupon",
    header: "Coupon",
    cell: (row) => row.couponCode ?? "—",
    search: (row) => row.couponCode,
  },
  {
    key: "followUp",
    header: "Follow-up",
    className: "align-top",
    cell: (row) => <FollowUpCell target={{ kind: "enrollment", id: row.id }} initial={row.followUp} />,
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

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const facets = useMemo<Facet<PaymentRow>[]>(
    () => [
      {
        key: "status",
        label: "Any status",
        options: LEAD_STATUSES.map((value) => ({ value, label: LEAD_STATUS_LABEL[value] })),
        valueOf: (row) => row.followUp.status,
      },
      {
        key: "called",
        label: "Called or not",
        options: [
          { value: "no", label: "Not called" },
          { value: "yes", label: "Called" },
        ],
        valueOf: (row) => (row.followUp.called ? "yes" : "no"),
      },
      {
        key: "source",
        // Only the gateways that actually appear, so the list never offers one
        // this account has never taken a payment through.
        label: "Any source",
        options: [...new Set(rows.map((row) => row.source))]
          .sort()
          .map((value) => ({ value, label: title(value) })),
        valueOf: (row) => row.source,
      },
    ],
    [rows],
  );

  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      facets={facets}
      filterPlaceholder="Search name, email, coupon…"
      empty="No enrolments yet."
      minWidth={980}
      rowKey={(row) => row.id}
    />
  );
}
