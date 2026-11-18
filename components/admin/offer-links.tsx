"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "./data-table";
import { OFFER_CURRENCIES, formatOfferAmount, type OfferCurrency } from "@/lib/offer-shape";

export type OfferRow = {
  code: string;
  amount: number;
  currency: OfferCurrency;
  originalAmount?: number;
  note?: string;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string;
};

/** Built here rather than server-side so a link copied from a local run
 *  points at the local host — pasting a production URL into a dev tab is a
 *  confusing way to find out the page works. */
function linkFor(code: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/?offer=${code}`;
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          /* Clipboard refused (no permission, or an insecure origin) — the
             link is on screen in full, so there is still a way to take it. */
        }
      }}
      className="shrink-0 rounded-full border border-neutral-90/15 px-3 py-1 font-noi-grotesk text-[13px] text-neutral-70 transition-colors duration-150 hover:border-neutral-90/40 hover:text-neutral-90"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function OfferLinks({ rows, siteUrl }: { rows: OfferRow[]; siteUrl: string }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<OfferCurrency>("INR");
  const [amount, setAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [note, setNote] = useState("");
  const [uses, setUses] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<OfferRow | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          originalAmount: originalAmount ? Number(originalAmount) : undefined,
          note: note.trim() || undefined,
          maxUses: uses === "unlimited" ? null : Number(uses),
        }),
      });
      const data = (await res.json()) as { error?: string; offer?: OfferRow };
      if (!res.ok || !data.offer) throw new Error(data.error ?? "That didn't work.");
      setMade(data.offer);
      setAmount("");
      setOriginalAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(code: string, active: boolean) {
    await fetch("/api/admin/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, active }),
    });
    router.refresh();
  }

  /* No width here. `w-full` in a shared base and `w-24` at the call site are
     the same property, and Tailwind resolves that by stylesheet order, not by
     the order they appear in the class attribute — so the currency select ate
     the whole column and squeezed the amount box to nothing. */
  const FIELD =
    "h-10 rounded-xl border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[14px] text-neutral-90 outline-none focus:border-neutral-90/40";
  const LABEL = "font-noi-grotesk text-[13px] text-neutral-50";

  const columns: Column<OfferRow>[] = [
    {
      key: "price",
      header: "Price",
      className: "whitespace-nowrap",
      cell: (row) => (
        <span className="flex items-baseline gap-2">
          <span className="text-neutral-90">{formatOfferAmount(row.amount, row.currency)}</span>
          {row.originalAmount !== undefined && (
            <span className="font-noi-grotesk text-[12px] text-neutral-50 line-through">
              {formatOfferAmount(row.originalAmount, row.currency)}
            </span>
          )}
        </span>
      ),
      search: (row) => `${row.amount} ${row.currency}`,
    },
    {
      key: "note",
      header: "Who it's for",
      cell: (row) => row.note || "—",
      search: (row) => row.note,
    },
    {
      key: "link",
      header: "Link",
      cell: (row) => (
        <span className="flex items-center gap-2">
          <code className="font-mono text-[12px] text-neutral-70">?offer={row.code}</code>
          <CopyButton value={linkFor(row.code, siteUrl)} />
        </span>
      ),
      search: (row) => row.code,
    },
    {
      key: "uses",
      header: "Used",
      className: "whitespace-nowrap text-neutral-50",
      cell: (row) => `${row.usedCount} / ${row.maxUses ?? "∞"}`,
    },
    {
      key: "state",
      header: "",
      className: "whitespace-nowrap text-right",
      cell: (row) => {
        const spent = row.maxUses !== null && row.usedCount >= row.maxUses;
        return (
          <span className="flex items-center justify-end gap-2">
            {spent && (
              <span className="rounded-full bg-neutral-90/8 px-2.5 py-0.5 font-noi-grotesk text-[12px] text-neutral-50">
                Used up
              </span>
            )}
            <button
              type="button"
              onClick={() => toggle(row.code, !row.active)}
              className={`rounded-full border px-3 py-1 font-noi-grotesk text-[13px] transition-colors duration-150 ${
                row.active
                  ? "border-neutral-90/15 text-neutral-70 hover:border-neutral-90/40 hover:text-neutral-90"
                  : "border-neutral-90/15 bg-neutral-90 text-white"
              }`}
            >
              {row.active ? "Switch off" : "Switch on"}
            </button>
          </span>
        );
      },
      search: (row) => (row.active ? "live active on" : "off inactive disabled"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={create} className="flex flex-col gap-4 rounded-2xl bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="offer-amount">
              They pay
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as OfferCurrency)}
                className={FIELD + " w-20 shrink-0"}
              >
                {OFFER_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                id="offer-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="2999"
                className={FIELD + " min-w-0 flex-1"}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="offer-original">
              Instead of <span className="text-neutral-50/70">(optional)</span>
            </label>
            <input
              id="offer-original"
              value={originalAmount}
              onChange={(e) => setOriginalAmount(e.target.value)}
              inputMode="decimal"
              placeholder="10000"
              className={FIELD + " w-full"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="offer-note">
              Who it&rsquo;s for
            </label>
            <input
              id="offer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Rahul — corporate rate"
              className={FIELD + " w-full"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL} htmlFor="offer-uses">
              Can be used
            </label>
            <select
              id="offer-uses"
              value={uses}
              onChange={(e) => setUses(e.target.value)}
              className={FIELD + " w-full"}
            >
              <option value="1">Once</option>
              <option value="5">5 times</option>
              <option value="25">25 times</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="font-noi-grotesk text-[13px] text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-noi-grotesk text-[13px] text-neutral-50">
            This price holds wherever they open it — India, the Gulf, anywhere.
          </p>
          <button
            type="submit"
            disabled={busy || !amount.trim()}
            className="inline-flex h-10 items-center rounded-full bg-neutral-90 px-5 font-noi-grotesk text-[14px] font-medium text-white transition-colors duration-150 hover:bg-neutral-70 disabled:opacity-40"
          >
            {busy ? "Making…" : "Make the link"}
          </button>
        </div>
      </form>

      {made && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-lime-30/25 px-4 py-3">
          <span className="font-noi-grotesk text-[14px] text-neutral-90">
            {formatOfferAmount(made.amount, made.currency)}
            {made.note ? ` · ${made.note}` : ""}
          </span>
          <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-neutral-70">
            {linkFor(made.code, siteUrl)}
          </code>
          <CopyButton value={linkFor(made.code, siteUrl)} />
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        filterPlaceholder="Search price, name, code…"
        empty="No links yet."
        minWidth={820}
        rowKey={(row) => row.code}
      />
    </div>
  );
}
