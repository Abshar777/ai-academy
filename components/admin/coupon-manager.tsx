"use client";

import { useState, type FormEvent } from "react";

export type PlainCoupon = {
  code: string;
  discountType: "percent" | "fixed" | "free";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  note: string | null;
  createdAt: string;
};

function formatDiscount(coupon: Pick<PlainCoupon, "discountType" | "discountValue">) {
  if (coupon.discountType === "free") return "100% off (free)";
  if (coupon.discountType === "percent") return `${coupon.discountValue}% off`;
  return `${coupon.discountValue} off (fixed)`;
}

const FIELD =
  "h-10 w-full rounded-lg border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[14px] outline-none focus:border-neutral-90";
const LABEL = "font-noi-grotesk text-[13px] font-medium text-neutral-90";

export function CouponManager({ initialCoupons }: { initialCoupons: PlainCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [quantity, setQuantity] = useState("1");
  const [maxUses, setMaxUses] = useState("1");
  const [discountType, setDiscountType] = useState<PlainCoupon["discountType"]>("free");
  const [discountValue, setDiscountValue] = useState("100");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [justGenerated, setJustGenerated] = useState<string[]>([]);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setGenerating(true);
    setError("");
    setJustGenerated([]);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(quantity),
          maxUses: Number(maxUses),
          discountType,
          discountValue: Number(discountValue),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not generate coupons.");
        return;
      }
      const generated: PlainCoupon[] = data.coupons.map(
        (c: { code: string; discountType: PlainCoupon["discountType"]; discountValue: number; maxUses: number; usedCount: number; active: boolean; note?: string; createdAt: string }) => ({
          ...c,
          note: c.note ?? null,
        }),
      );
      setCoupons((prev) => [...generated, ...prev]);
      setJustGenerated(generated.map((c) => c.code));
    } catch {
      setError("Could not generate coupons.");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleActive(code: string, active: boolean) {
    setCoupons((prev) => prev.map((c) => (c.code === code ? { ...c, active } : c)));
    const res = await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      // Revert on failure — the optimistic update above was wrong.
      setCoupons((prev) => prev.map((c) => (c.code === code ? { ...c, active: !active } : c)));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
        Coupons
      </h1>

      <form
        onSubmit={handleGenerate}
        className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 sm:grid-cols-5"
      >
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="c-quantity">
            Quantity
          </label>
          <input
            id="c-quantity"
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="c-max-uses">
            Max uses each
          </label>
          <input
            id="c-max-uses"
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="c-discount-type">
            Discount
          </label>
          <select
            id="c-discount-type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as PlainCoupon["discountType"])}
            className={FIELD}
          >
            <option value="free">Free (100%)</option>
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="c-discount-value">
            {discountType === "percent" ? "Percent" : discountType === "fixed" ? "Amount off" : "Value"}
          </label>
          <input
            id="c-discount-value"
            type="number"
            min={0}
            disabled={discountType === "free"}
            value={discountType === "free" ? "100" : discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className={FIELD + " disabled:opacity-50"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="c-note">
            Note (optional)
          </label>
          <input
            id="c-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Delta Digital Academy"
            className={FIELD}
          />
        </div>

        <div className="col-span-2 flex items-end sm:col-span-5">
          <button
            type="submit"
            disabled={generating}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-90 px-5 font-noi-grotesk text-[14px] font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
          >
            {generating ? "Generating…" : "Generate coupons"}
          </button>
        </div>

        {error && (
          <p role="alert" className="col-span-2 font-noi-grotesk text-[13px] text-[#c0392b] sm:col-span-5">
            {error}
          </p>
        )}

        {justGenerated.length > 0 && (
          <div className="col-span-2 flex flex-col gap-2 rounded-lg bg-lime-30/15 p-4 sm:col-span-5">
            <span className="font-noi-grotesk text-[13px] font-medium text-neutral-90">
              Generated {justGenerated.length} code{justGenerated.length === 1 ? "" : "s"}:
            </span>
            <div className="flex flex-wrap gap-2">
              {justGenerated.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(code)}
                  title="Copy"
                  className="rounded-md bg-white px-2.5 py-1 font-noi-grotesk text-[13px] tabular-nums text-neutral-90 ring-1 ring-neutral-90/10 transition hover:ring-neutral-90/30"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {coupons.length === 0 ? (
        <p className="font-noi-grotesk text-[14px] text-neutral-50">No coupons yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[720px] border-collapse font-noi-grotesk text-[14px]">
            <thead>
              <tr className="border-b border-neutral-90/8 text-left text-neutral-50">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Uses</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-b border-neutral-90/6 last:border-0">
                  <td className="px-4 py-3 tabular-nums">{c.code}</td>
                  <td className="px-4 py-3">{formatDiscount(c)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.usedCount} / {c.maxUses}
                  </td>
                  <td className="px-4 py-3 text-neutral-50">{c.note ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-50">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(c.code, !c.active)}
                      className={
                        "rounded-full px-2.5 py-1 text-[12px] font-medium " +
                        (c.active
                          ? "bg-lime-30/25 text-neutral-90 hover:bg-lime-30/40"
                          : "bg-neutral-90/8 text-neutral-50 hover:bg-neutral-90/15")
                      }
                    >
                      {c.active ? "Active" : "Disabled"}
                    </button>
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
