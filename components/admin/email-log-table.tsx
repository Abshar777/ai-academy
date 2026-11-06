"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column, type Facet } from "./data-table";
// From email-kinds, never email-log: that one imports the MongoDB driver, and
// a runtime value taken from it here would ship the driver to the browser.
import { EMAIL_KIND_LABEL, type EmailKind, type EmailStatus } from "@/lib/email-kinds";

export type EmailRow = {
  id: string;
  createdAt: string;
  kind: EmailKind;
  to: string;
  subject: string;
  status: EmailStatus;
  error?: string | null;
  mailbox?: string | null;
  hasBody: boolean;
  attachments: string[];
  service: "web" | "api";
  /** Set when this row is itself a resend of an earlier one. */
  resentFrom?: string | null;
  canResend: boolean;
};

const STATUS_STYLE: Record<EmailStatus, string> = {
  sent: "bg-lime-30/25 text-neutral-90",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-neutral-90/8 text-neutral-50",
};

const STATUS_LABEL: Record<EmailStatus, string> = {
  sent: "Sent",
  failed: "Failed",
  skipped: "Not sent",
};

export function EmailLogTable({ rows }: { rows: EmailRow[] }) {
  const router = useRouter();
  /** Which row's body is open. One at a time — these are full emails. */
  const [preview, setPreview] = useState<EmailRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function resend(row: EmailRow, to?: string) {
    setBusy(row.id);
    setNote(null);
    try {
      const res = await fetch("/api/admin/emails/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...(to ? { to } : {}) }),
      });
      const data = (await res.json()) as { sent?: boolean; to?: string; error?: string };
      if (!res.ok || !data.sent) {
        setNote({ id: row.id, text: data.error ?? "Could not send.", ok: false });
        return;
      }
      setNote({ id: row.id, text: `Sent again to ${data.to}.`, ok: true });
      // The resend writes its own row; show it.
      router.refresh();
    } catch (err) {
      setNote({ id: row.id, text: err instanceof Error ? err.message : "Could not send.", ok: false });
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<EmailRow>[] = [
    {
      key: "date",
      header: "When",
      className: "whitespace-nowrap text-neutral-50",
      cell: (row) =>
        new Date(row.createdAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      search: (row) =>
        new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
    {
      key: "kind",
      header: "Email",
      cell: (row) => (
        <span className="flex flex-col gap-0.5">
          <span>{EMAIL_KIND_LABEL[row.kind] ?? row.kind}</span>
          {row.resentFrom && (
            <span className="font-noi-grotesk text-[11px] text-neutral-50">resent by hand</span>
          )}
        </span>
      ),
      search: (row) => `${EMAIL_KIND_LABEL[row.kind] ?? ""} ${row.kind}`,
    },
    { key: "to", header: "To", cell: (row) => row.to, search: (row) => row.to },
    {
      key: "subject",
      header: "Subject",
      cell: (row) => <span className="text-neutral-50">{row.subject}</span>,
      search: (row) => row.subject,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <span
            className={`inline-block rounded-full px-2.5 py-1 font-noi-grotesk text-[12px] leading-none ${STATUS_STYLE[row.status]}`}
          >
            {STATUS_LABEL[row.status]}
          </span>
          {row.error && (
            // The reason is the whole point of a failed row, so it is on the
            // page rather than behind a click — truncated, with the full text
            // in the title for the ones that run long.
            <span
              title={row.error}
              className="max-w-[220px] truncate font-noi-grotesk text-[11px] text-neutral-50"
            >
              {row.error}
            </span>
          )}
        </span>
      ),
      search: (row) => `${row.status} ${row.error ?? ""}`,
    },
    {
      key: "actions",
      header: "",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5">
            {row.hasBody && (
              <button
                id={`email-view-${row.id}`}
                type="button"
                onClick={() => setPreview(row)}
                className="rounded-full border border-neutral-90/15 px-3 py-1.5 font-noi-grotesk text-[12px] leading-none transition-colors duration-150 hover:bg-neutral-90/6"
              >
                View
              </button>
            )}
            {row.canResend && row.hasBody && (
              <button
                id={`email-resend-${row.id}`}
                type="button"
                disabled={busy === row.id}
                onClick={() => void resend(row)}
                className="rounded-full bg-neutral-90 px-3 py-1.5 font-noi-grotesk text-[12px] leading-none text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-40"
              >
                {busy === row.id ? "Sending…" : "Resend"}
              </button>
            )}
          </span>
          {note?.id === row.id && (
            <span
              className={`font-noi-grotesk text-[11px] ${note.ok ? "text-lime-700" : "text-red-600"}`}
            >
              {note.text}
            </span>
          )}
        </span>
      ),
    },
  ];

  const facets: Facet<EmailRow>[] = [
    {
      key: "kind",
      label: "Any email",
      options: (Object.keys(EMAIL_KIND_LABEL) as EmailKind[]).map((k) => ({
        value: k,
        label: EMAIL_KIND_LABEL[k],
      })),
      valueOf: (row) => row.kind,
    },
    {
      key: "status",
      label: "Any status",
      options: [
        { value: "sent", label: "Sent" },
        { value: "failed", label: "Failed" },
        { value: "skipped", label: "Not sent" },
      ],
      valueOf: (row) => row.status,
    },
    {
      key: "service",
      label: "Anywhere",
      options: [
        { value: "web", label: "Website" },
        { value: "api", label: "Course app" },
      ],
      valueOf: (row) => row.service,
    },
  ];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        facets={facets}
        filterPlaceholder="Search by address, subject or error…"
        minWidth={900}
        empty="No emails logged yet. Every send from here on is recorded."
      />

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-90/55 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-90/10 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-noi-grotesk text-[15px] text-neutral-90">
                  {preview.subject}
                </p>
                <p className="mt-0.5 font-noi-grotesk text-[13px] text-neutral-50">
                  To {preview.to}
                  {preview.mailbox ? ` · from ${preview.mailbox}` : ""}
                  {preview.attachments.length
                    ? ` · ${preview.attachments.join(", ")}`
                    : ""}
                </p>
              </div>
              <button
                id="email-preview-close"
                type="button"
                onClick={() => setPreview(null)}
                className="shrink-0 rounded-full border border-neutral-90/15 px-3 py-1.5 font-noi-grotesk text-[13px] leading-none transition-colors duration-150 hover:bg-neutral-90/6"
              >
                Close
              </button>
            </div>
            {/* Sandboxed, and served from the API rather than written into this
                document: a stored email body is HTML from our own templates,
                but rendering it inline would still let anything that ever got
                into one run as part of the admin page. */}
            <iframe
              id="email-preview-frame"
              title="Email body"
              sandbox=""
              src={`/api/admin/emails/body?id=${encodeURIComponent(preview.id)}`}
              className="h-[70vh] w-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
