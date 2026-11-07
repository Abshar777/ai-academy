import Link from "next/link";
import { getEnrollmentStats } from "@/lib/enrollments";
import { formatMinorUnits } from "@/lib/revenue";

/** Revenue moves the moment a payment verifies or an admin edits a row, and
 *  every other page that reads this collection says the same — a cached
 *  figure here would be a correct number shown at the wrong time. */
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white p-6">
      <span className="font-noi-grotesk text-[13px] text-neutral-50">{label}</span>
      <span className="font-sans-plomb text-[32px] leading-[1] font-semibold tracking-[-0.015em] text-neutral-90">
        {value}
      </span>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const stats = await getEnrollmentStats();

  if (stats === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see enrollment data
        here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total enrolled" value={String(stats.total)} />
        <StatCard label="Paid (Razorpay)" value={String(stats.paidCount)} />
        <StatCard label="Paid (Abzer)" value={String(stats.abzerPaidCount)} />
        <StatCard label="Free (coupon)" value={String(stats.freeCount)} />
        {/* Each currency counts every source — Razorpay bills AED as well as
            INR, and money taken by hand belongs in the total too. */}
        <StatCard label="Revenue (INR)" value={formatMinorUnits(stats.inrRevenueMinorUnits, "INR")} />
        <StatCard label="Revenue (AED)" value={formatMinorUnits(stats.aedRevenueMinorUnits, "AED")} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/payments"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-90 px-4 font-noi-grotesk text-[14px] font-medium text-white transition duration-150 hover:bg-neutral-70"
        >
          View payments
        </Link>
        <Link
          href="/admin/reports"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-90 px-4 font-noi-grotesk text-[14px] font-medium transition duration-150 hover:bg-neutral-90/8"
        >
          Revenue reports
        </Link>
        <Link
          href="/admin/coupons"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-90 px-4 font-noi-grotesk text-[14px] font-medium transition duration-150 hover:bg-neutral-90/8"
        >
          Manage coupons
        </Link>
      </div>
    </div>
  );
}
