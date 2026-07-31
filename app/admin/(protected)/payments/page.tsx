import { listEnrollments } from "@/lib/enrollments";

function formatAmount(amountMinorUnits: number, currency: string) {
  if (amountMinorUnits === 0) return "Free";
  return `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
}

export default async function AdminPaymentsPage() {
  const enrollments = await listEnrollments({ limit: 300 });

  if (enrollments === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see payments here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
        Payments &amp; enrolments
      </h1>

      {enrollments.length === 0 ? (
        <p className="font-noi-grotesk text-[14px] text-neutral-50">No enrolments yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[720px] border-collapse font-noi-grotesk text-[14px]">
            <thead>
              <tr className="border-b border-neutral-90/8 text-left text-neutral-50">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Coupon</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e, i) => (
                <tr key={i} className="border-b border-neutral-90/6 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-50">
                    {new Date(e.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">{e.name || "—"}</td>
                  <td className="px-4 py-3">{e.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{e.phone || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatAmount(e.amountMinorUnits, e.currency)}
                  </td>
                  <td className="px-4 py-3 capitalize">{e.source}</td>
                  <td className="px-4 py-3">{e.couponCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
