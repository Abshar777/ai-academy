import { listSeminarRegistrations } from "@/lib/seminar-registrations";
import { SeminarTable, type SeminarRow } from "@/components/admin/seminar-table";
import { formatWebinarDate, formatWebinarTime, nextWebinarSession } from "@/lib/next-webinar";

/** Registrations change between page loads, so this can't be cached. */
export const dynamic = "force-dynamic";

export default async function AdminSeminarPage() {
  const registrations = await listSeminarRegistrations();
  const next = nextWebinarSession();

  if (registrations === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see registrations here.
      </div>
    );
  }

  /* Plain values only across the client boundary — see the payments page. */
  const rows: SeminarRow[] = registrations.map((r) => ({
    createdAt: new Date(r.createdAt).toISOString(),
    name: r.name ?? null,
    email: r.email,
    phone: r.phone ?? null,
    country: r.country ?? null,
    startsAt: new Date(r.startsAt).toISOString(),
    invited: Boolean(r.invited),
  }));

  const upcoming = next ? registrations.filter((r) => r.startsAt === next.startsAt) : [];
  // A registrant Google never accepted onto the event got no invitation, so
  // this is the number worth acting on rather than a statistic.
  const notInvited = registrations.filter((r) => !r.invited).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
          Seminar registrations
        </h1>
        <p className="font-noi-grotesk text-[14px] text-neutral-50">
          {next
            ? `${upcoming.length} booked for ${formatWebinarDate(new Date(next.startsAt))} · ${formatWebinarTime(new Date(next.startsAt))}`
            : "No seminar scheduled"}
          {notInvited > 0 && ` · ${notInvited} with no calendar invite`}
        </p>
      </div>

      <SeminarTable rows={rows} />
    </div>
  );
}
