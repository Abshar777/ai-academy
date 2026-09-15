import { listEnrollments } from "@/lib/enrollments";
import { PaymentsTable, type PaymentRow } from "@/components/admin/payments-table";

export default async function AdminPaymentsPage() {
  const enrollments = await listEnrollments({ limit: 300 });

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
    createdAt: new Date(e.createdAt).toISOString(),
    name: e.name ?? null,
    email: e.email,
    phone: e.phone ?? null,
    amountMinorUnits: e.amountMinorUnits,
    currency: e.currency,
    source: e.source,
    couponCode: e.couponCode ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
        Payments &amp; enrolments
      </h1>
      <PaymentsTable rows={rows} />
    </div>
  );
}
