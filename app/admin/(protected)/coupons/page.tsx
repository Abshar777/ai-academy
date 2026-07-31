import { listCoupons } from "@/lib/coupons";
import { CouponManager } from "@/components/admin/coupon-manager";

export default async function AdminCouponsPage() {
  const coupons = await listCoupons();

  if (coupons === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to manage coupons here.
      </div>
    );
  }

  // Server -> Client Component props must be plain, serializable data —
  // the raw Mongo documents carry an ObjectId `_id` and a Date, neither of
  // which cross that boundary cleanly.
  const plainCoupons = coupons.map((c) => ({
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    active: c.active,
    note: c.note ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  return <CouponManager initialCoupons={plainCoupons} />;
}
