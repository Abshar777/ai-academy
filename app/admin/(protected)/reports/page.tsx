import type { ReactNode } from "react";
import {
  getRevenueReport,
  formatMinorUnits,
  formatMonth,
  SOURCE_LABEL,
  type RevenueMonth,
  type RevenueBySource,
} from "@/lib/revenue";

/** Same reason as the payments page: an edit lands straight away. */
export const dynamic = "force-dynamic";

/* Each currency gets its own scale. ₹45,000 and AED 1,400 on one axis would
   draw the dirham months as a flat line against the rupee ones — the two are
   not comparable quantities, and a chart that implies they are is worse than
   two charts. The month columns stay in step across both so a reader can
   still look down a month and see both currencies. */
function MonthlyChart({
  months,
  rows,
  currency,
}: {
  months: string[];
  rows: RevenueMonth[];
  currency: string;
}) {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const max = Math.max(...rows.map((r) => r.minorUnits), 1);

  return (
    <div className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-full items-stretch gap-2 sm:gap-3">
        {months.map((month) => {
          const row = byMonth.get(month);
          const minorUnits = row?.minorUnits ?? 0;
          /* A real but tiny month still has to be visible, so anything above
             zero keeps a 3% floor. Zero stays zero — no phantom bar. */
          const height = minorUnits > 0 ? Math.max((minorUnits / max) * 100, 3) : 0;

          return (
            <div key={month} className="flex min-w-[72px] flex-1 flex-col items-center gap-2">
              <span className="font-noi-grotesk text-[11px] tabular-nums text-neutral-50 sm:text-[12px]">
                {minorUnits > 0 ? formatMinorUnits(minorUnits, currency) : "—"}
              </span>
              <div className="flex h-28 w-full items-end sm:h-36">
                <div
                  className="w-full rounded-t-md bg-neutral-90"
                  style={{ height: `${height}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-noi-grotesk text-[12px] whitespace-nowrap text-neutral-90">
                  {formatMonth(month)}
                </span>
                <span className="font-noi-grotesk text-[11px] text-neutral-50">
                  {row?.count ?? 0} enrolled
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceTable({
  rows,
  currency,
  totalMinorUnits,
}: {
  rows: RevenueBySource[];
  currency: string;
  totalMinorUnits: number;
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-neutral-90/8 text-left">
          <th className="pb-2 font-noi-grotesk text-[12px] font-normal text-neutral-50">
            How it arrived
          </th>
          <th className="pb-2 text-right font-noi-grotesk text-[12px] font-normal text-neutral-50">
            Enrolments
          </th>
          <th className="pb-2 text-right font-noi-grotesk text-[12px] font-normal text-neutral-50">
            Amount
          </th>
          <th className="pb-2 text-right font-noi-grotesk text-[12px] font-normal text-neutral-50">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.source} className="border-b border-neutral-90/5 last:border-0">
            <td className="py-2.5 font-noi-grotesk text-[14px] text-neutral-90">
              {SOURCE_LABEL[row.source] ?? row.source}
            </td>
            <td className="py-2.5 text-right font-noi-grotesk text-[14px] tabular-nums text-neutral-50">
              {row.count}
            </td>
            <td className="py-2.5 text-right font-noi-grotesk text-[14px] tabular-nums text-neutral-90">
              {formatMinorUnits(row.minorUnits, currency)}
            </td>
            <td className="py-2.5 text-right font-noi-grotesk text-[14px] tabular-nums text-neutral-50">
              {totalMinorUnits > 0
                ? `${Math.round((row.minorUnits / totalMinorUnits) * 100)}%`
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
      {children}
    </div>
  );
}

export default async function AdminReportsPage() {
  const report = await getRevenueReport();

  if (report === null) {
    return (
      <Notice>
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see revenue here.
      </Notice>
    );
  }

  if (report.currencies.length === 0) {
    return <Notice>No enrolments yet, so there is nothing to report.</Notice>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
          Revenue
        </h1>
        {/* Said once, plainly: the two figures are never added up. */}
        <p className="font-noi-grotesk text-[13px] text-neutral-50">
          Each currency is counted on its own and never converted or added together. Months follow
          Indian dates. Archived enrolments are excluded, as everywhere else.
        </p>
      </div>

      {/* Totals abreast, so the two currencies read as peers. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {report.totals.map((total) => (
          <div key={total.currency} className="flex flex-col gap-1 rounded-2xl bg-white p-6">
            <span className="font-noi-grotesk text-[13px] text-neutral-50">
              Revenue ({total.currency})
            </span>
            <span className="font-sans-plomb text-[32px] leading-[1] font-semibold tracking-[-0.015em] text-neutral-90">
              {formatMinorUnits(total.minorUnits, total.currency)}
            </span>
            <span className="font-noi-grotesk text-[13px] text-neutral-50">
              across {total.count} {total.count === 1 ? "enrolment" : "enrolments"}
            </span>
          </div>
        ))}
      </div>

      {report.totals.map((total) => {
        const monthRows = report.byMonth.filter((m) => m.currency === total.currency);
        const sourceRows = report.bySource.filter((s) => s.currency === total.currency);

        return (
          <section key={total.currency} className="flex flex-col gap-5 rounded-2xl bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-noi-grotesk text-[16px] font-medium tracking-[-0.015em] text-neutral-90">
                {total.currency} month by month
              </h2>
              <span className="font-noi-grotesk text-[13px] tabular-nums text-neutral-50">
                {formatMinorUnits(total.minorUnits, total.currency)} total
              </span>
            </div>

            <MonthlyChart months={report.months} rows={monthRows} currency={total.currency} />

            <div className="flex flex-col gap-3 border-t border-neutral-90/8 pt-5">
              <h3 className="font-noi-grotesk text-[14px] font-medium text-neutral-90">
                Where the {total.currency} came from
              </h3>
              <SourceTable
                rows={sourceRows}
                currency={total.currency}
                totalMinorUnits={total.minorUnits}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
