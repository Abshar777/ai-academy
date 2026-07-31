import Link from "next/link";
import { getEnrollmentStats } from "@/lib/enrollments";

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total enrolled" value={String(stats.total)} />
        <StatCard label="Paid (Razorpay)" value={String(stats.paidCount)} />
        <StatCard label="Free (coupon)" value={String(stats.freeCount)} />
        <StatCard
          label="Revenue (INR)"
          value={(stats.totalRevenueMinorUnits / 100).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          })}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/payments"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-90 px-4 font-noi-grotesk text-[14px] font-medium text-white transition duration-150 hover:bg-neutral-70"
        >
          View payments
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
