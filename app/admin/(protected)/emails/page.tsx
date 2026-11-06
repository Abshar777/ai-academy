import { getEmailLogStats, listEmailLog } from "@/lib/email-log";
import { canResend } from "@/lib/email-kinds";
import { EmailLogTable, type EmailRow } from "@/components/admin/email-log-table";

/** A resend writes a row the moment it lands, so this can't be cached. */
export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  const [entries, stats] = await Promise.all([listEmailLog({ limit: 500 }), getEmailLogStats()]);

  if (entries === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see the email log here.
      </div>
    );
  }

  /* Mongo hands back ObjectIds and Dates, and the bodies are far too large to
     ship to the browser for every row at once. Narrowed to what the table
     shows; the body is fetched one at a time when a row is opened. */
  const rows: EmailRow[] = entries.map((entry) => ({
    id: entry._id.toHexString(),
    createdAt: new Date(entry.createdAt).toISOString(),
    kind: entry.kind,
    to: entry.to,
    subject: entry.subject,
    status: entry.status,
    error: entry.error ?? null,
    mailbox: entry.mailbox ?? null,
    hasBody: Boolean(entry.bodyHtml),
    attachments: (entry.attachments ?? []).map((a) => a.filename),
    service: entry.service ?? "web",
    resentFrom: entry.resentFrom ? entry.resentFrom.toHexString() : null,
    canResend: canResend(entry.kind),
  }));

  const summary: { label: string; value: number; tone: string }[] = [
    { label: "Sent", value: stats?.sent ?? 0, tone: "text-neutral-90" },
    { label: "Failed", value: stats?.failed ?? 0, tone: "text-red-600" },
    { label: "Not sent", value: stats?.skipped ?? 0, tone: "text-neutral-50" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
            Email log
          </h1>
          <p className="mt-1 max-w-xl font-noi-grotesk text-[14px] leading-[1.5] text-neutral-50">
            Every email the website and the course app send. Open one to read exactly what the
            recipient got, or send it again.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white px-4 py-2.5">
              <p className="font-noi-grotesk text-[12px] text-neutral-50">{item.label}</p>
              <p className={`font-noi-grotesk text-[20px] tabular-nums ${item.tone}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <EmailLogTable rows={rows} />
    </div>
  );
}
