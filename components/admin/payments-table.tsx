"use client";

import { DataTable, type Column } from "./data-table";

export type PaymentRow = {
  createdAt: string | number | Date;
  name?: string | null;
  email: string;
  phone?: string | null;
  amountMinorUnits: number;
  currency: string;
  source: string;
  couponCode?: string | null;
};

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
];

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      filterPlaceholder="Filter by name, email, coupon…"
      empty="No enrolments yet."
      minWidth={720}
    />
  );
}
