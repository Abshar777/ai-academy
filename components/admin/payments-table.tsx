"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column, type Facet } from "./data-table";
import { FollowUpCell } from "./follow-up-cell";
import { EnrollmentEditor } from "./enrollment-editor";
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
  country?: string | null;
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

export function PaymentsTable({
  rows,
  archived = false,
}: {
  rows: PaymentRow[];
  /** Showing the archive rather than the live list. Changes what the bulk
   *  action does and what the empty state says. */
  archived?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo<Column<PaymentRow>[]>(
    () => [
      ...COLUMNS,
      {
        key: "edit",
        header: "",
        className: "text-right",
        cell: (row) => (
          <button
            type="button"
            onClick={() => setEditing(row)}
            className="rounded-full border border-neutral-90/15 px-3 py-1 font-noi-grotesk text-[13px] text-neutral-70 transition-colors duration-150 hover:border-neutral-90/40 hover:text-neutral-90"
          >
            Edit
          </button>
        ),
      },
    ],
    [],
  );

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

  /** What the selection is worth, shown before archiving it — the number
   *  that is about to leave the revenue figures. */
  const selectedTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      if (!selected.has(row.id) || row.amountMinorUnits === 0) continue;
      totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinorUnits);
    }
    return [...totals].map(([currency, amount]) => `${currency} ${(amount / 100).toFixed(2)}`);
  }, [rows, selected]);

  async function archiveSelected() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/enrollments/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], archived: !archived }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That didn't work.");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-90/8 bg-white px-4 py-3">
          <p className="font-noi-grotesk text-[14px] text-neutral-90">
            {selected.size} selected
            {selectedTotals.length > 0 && (
              <span className="text-neutral-50"> · {selectedTotals.join(" + ")}</span>
            )}
          </p>
          {error && (
            <p role="alert" className="font-noi-grotesk text-[13px] text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="font-noi-grotesk text-[13px] text-neutral-50 transition-colors duration-150 hover:text-neutral-90"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={archiveSelected}
            disabled={busy}
            className="ml-auto inline-flex h-9 items-center rounded-full bg-neutral-90 px-4 font-noi-grotesk text-[14px] font-medium text-white transition-colors duration-150 hover:bg-neutral-70 disabled:opacity-40"
          >
            {busy ? "Working…" : archived ? "Restore selected" : "Archive selected"}
          </button>
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        filterPlaceholder="Search name, email, coupon…"
        empty={archived ? "Nothing archived." : "No enrolments yet."}
        minWidth={1080}
        rowKey={(row) => row.id}
        selection={{ selected, onChange: setSelected }}
      />

      {editing && (
        <EnrollmentEditor
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
