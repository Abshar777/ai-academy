"use client";

import { useMemo, useState, type ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** What this column contributes to the filter. Omit to leave it unsearchable. */
  search?: (row: T) => string | null | undefined;
  /** Extra classes for this column's cells — alignment, nowrap, and the like. */
  className?: string;
};

/**
 * A dropdown that narrows the list to rows sharing one value — a status, a
 * payment source, whether anyone has called. Typing the word works too, but a
 * list of the values that actually exist is faster than remembering them, and
 * cannot be misspelt.
 */
export type Facet<T> = {
  key: string;
  /** Shown as the "all" option, e.g. "Any status". */
  label: string;
  options: { value: string; label: string }[];
  /** This row's value for the facet, matched against the chosen option. */
  valueOf: (row: T) => string;
};

/**
 * The admin's one table: filter, pagination, and the empty states around them.
 *
 * Every list here had grown past the point of being read by scrolling — three
 * hundred enrolments, sixty registrations — with no way to find one row or to
 * stop the page growing with the data.
 *
 * Columns carry their own cell renderers, so a server page passes plain data to
 * a small client wrapper that defines them; render functions cannot cross that
 * boundary themselves.
 */
export function DataTable<T>({
  rows,
  columns,
  pageSize = 25,
  filterPlaceholder = "Filter…",
  empty = "Nothing here yet.",
  minWidth = 720,
  rowKey,
  facets = [],
}: {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  filterPlaceholder?: string;
  empty?: ReactNode;
  minWidth?: number;
  /** Something stable that identifies a row. Required in practice for any
   *  table whose cells hold state of their own: keyed by position instead, a
   *  half-typed note would stay behind on the row number while filtering or
   *  paging moved a different lead into it. */
  rowKey?: (row: T) => string;
  /** Dropdowns beside the search box. Combined with each other and with the
   *  text: a row has to satisfy all of them. */
  facets?: Facet<T>[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  /** Facet key → chosen value. A key that is absent means "any". */
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const active = Object.entries(chosen).filter(([, value]) => value !== "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const picked = Object.entries(chosen).filter(([, value]) => value !== "");
    if (!q && picked.length === 0) return rows;

    return rows.filter((row) => {
      for (const [key, value] of picked) {
        const facet = facets.find((f) => f.key === key);
        if (facet && facet.valueOf(row) !== value) return false;
      }
      if (!q) return true;
      return columns.some((column) => column.search?.(row)?.toLowerCase().includes(q));
    });
  }, [rows, columns, query, chosen, facets]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamped while rendering rather than reset in an effect: filtering down to
  // fewer pages while on a later one would otherwise show a blank table for a
  // frame, and the lint here flags state set from an effect body.
  const current = Math.min(page, pageCount - 1);
  const start = current * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const buttonClass =
    "inline-flex h-9 items-center rounded-full border border-neutral-90/15 px-4 font-noi-grotesk text-[13px] text-neutral-90 transition-colors duration-150 hover:border-neutral-90/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-90/15";

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        {empty}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder={filterPlaceholder}
          aria-label={filterPlaceholder}
          className="h-10 w-full max-w-xs min-w-[200px] flex-1 rounded-full border border-neutral-90/15 bg-white px-4 font-noi-grotesk text-[14px] text-neutral-90 outline-none transition-colors duration-150 placeholder:text-neutral-50 focus:border-neutral-90"
        />

        {facets.map((facet) => {
          const value = chosen[facet.key] ?? "";
          return (
            <select
              key={facet.key}
              value={value}
              aria-label={facet.label}
              onChange={(event) => {
                setChosen((current) => ({ ...current, [facet.key]: event.target.value }));
                setPage(0);
              }}
              className={`h-10 shrink-0 rounded-full border px-3.5 font-noi-grotesk text-[14px] outline-none transition-colors duration-150 ${
                value
                  ? "border-neutral-90 bg-neutral-90 text-white"
                  : "border-neutral-90/15 bg-white text-neutral-50 hover:border-neutral-90/40"
              }`}
            >
              <option value="" className="bg-white text-neutral-90">
                {facet.label}
              </option>
              {facet.options.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-neutral-90">
                  {option.label}
                </option>
              ))}
            </select>
          );
        })}

        {(active.length > 0 || query !== "") && (
          <button
            type="button"
            onClick={() => {
              setChosen({});
              setQuery("");
              setPage(0);
            }}
            className="h-10 shrink-0 rounded-full px-3 font-noi-grotesk text-[13px] text-neutral-50 transition-colors duration-150 hover:text-neutral-90"
          >
            Clear
          </button>
        )}

        <p className="ml-auto shrink-0 font-noi-grotesk text-[13px] text-neutral-50 tabular-nums">
          {filtered.length === rows.length
            ? `${rows.length} total`
            : `${filtered.length} of ${rows.length}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
          {query.trim() ? <>Nothing matches &ldquo;{query.trim()}&rdquo;.</> : "Nothing matches these filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table
            className="w-full border-collapse font-noi-grotesk text-[14px]"
            style={{ minWidth }}
          >
            <thead>
              <tr className="border-b border-neutral-90/8 text-left text-neutral-50">
                {columns.map((column) => (
                  <th key={column.key} className={`px-4 py-3 font-medium ${column.className ?? ""}`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row) : start + index}
                  className="border-b border-neutral-90/6 last:border-0"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 ${column.className ?? ""}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-noi-grotesk text-[13px] text-neutral-50 tabular-nums">
            {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className={buttonClass}
            >
              Previous
            </button>
            <span className="px-1 font-noi-grotesk text-[13px] text-neutral-50 tabular-nums">
              {current + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
              className={buttonClass}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
