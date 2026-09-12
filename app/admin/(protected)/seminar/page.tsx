import { listSeminarRegistrations } from "@/lib/seminar-registrations";
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

      {registrations.length === 0 ? (
        <p className="font-noi-grotesk text-[14px] text-neutral-50">No registrations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[760px] border-collapse font-noi-grotesk text-[14px]">
            <thead>
              <tr className="border-b border-neutral-90/8 text-left text-neutral-50">
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Invite</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r, i) => (
                <tr key={i} className="border-b border-neutral-90/6 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-50">
                    {new Date(r.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">{r.name || "—"}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.phone || "—"}</td>
                  <td className="px-4 py-3">{r.country || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-50">
                    {formatWebinarDate(new Date(r.startsAt))}
                  </td>
                  <td className="px-4 py-3">
                    {r.invited ? (
                      <span className="text-[#5d7a00]">sent</span>
                    ) : (
                      <span className="text-[#c0392b]">not sent</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
