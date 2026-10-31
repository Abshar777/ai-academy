import Link from "next/link";
import { listEnrollments } from "@/lib/enrollments";
import { PaymentsTable, type PaymentRow } from "@/components/admin/payments-table";
import { plainFollowUp } from "@/lib/lead-status";

/** Edits and archiving land straight away, so this can't be cached. */
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const archived = view === "archived";

  const enrollments = await listEnrollments({ limit: 300, archived });

  if (enrollments === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see payments here.
      </div>
    );
  }

  /* Mongo hands back ObjectIds and Dates; neither survives the trip to a client
     component, which only takes plain values. Narrowed here to exactly the
     fields the table shows, which also keeps _id out of the page source. */
  const rows: PaymentRow[] = enrollments.map((e) => ({
    id: e._id.toHexString(),
    createdAt: new Date(e.createdAt).toISOString(),
    name: e.name ?? null,
    email: e.email,
    phone: e.phone ?? null,
    country: e.country ?? null,
    amountMinorUnits: e.amountMinorUnits,
    currency: e.currency,
    source: e.source,
    couponCode: e.couponCode ?? null,
    followUp: plainFollowUp(e.followUp),
  }));

  const tabClass = (on: boolean) =>
    "rounded-full px-3.5 py-1.5 font-noi-grotesk text-[13px] transition-colors duration-150 " +
    (on ? "bg-neutral-90 text-white" : "text-neutral-50 hover:text-neutral-90");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
          Payments &amp; enrolments
        </h1>
        {/* Archived rows are hidden everywhere else — the table, the revenue
            figures, the public student count — so this is the one way back
            to them. */}
        <nav className="flex items-center gap-1 rounded-full bg-white p-1">
          <Link href="/admin/payments" className={tabClass(!archived)}>
            Live
          </Link>
          <Link href="/admin/payments?view=archived" className={tabClass(archived)}>
            Archived
          </Link>
        </nav>
      </div>
      <PaymentsTable rows={rows} archived={archived} />
    </div>
  );
}
