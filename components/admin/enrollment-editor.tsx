"use client";

import { useState } from "react";
import type { PaymentRow } from "./payments-table";

/**
 * Editing one enrolment, in a dialog over the table.
 *
 * Everything here can move money: amount, currency and how it was paid are
 * editable alongside the contact details. That is deliberate — closings
 * arrive by bank transfer often enough that a figure nobody can correct is
 * worse than one that can — but it is why the amount is entered in whole
 * units rather than the minor units the database stores. "2600" meaning
 * ₹26.00 is the kind of mistake that is only noticed a quarter later.
 *
 * Only changed fields are sent. A save that touches nothing is refused by
 * the API rather than stamping updatedAt on a row nobody edited.
 */

const SOURCES = ["razorpay", "stripe", "abzer", "coupon", "manual"] as const;

const FIELD =
  "h-10 w-full rounded-lg border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[14px] text-neutral-90 outline-none transition-colors duration-150 focus:border-neutral-90";
const LABEL = "font-noi-grotesk text-[12px] text-neutral-50";

export function EnrollmentEditor({
  row,
  onClose,
  onSaved,
}: {
  row: PaymentRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row.name ?? "");
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone ?? "");
  const [country, setCountry] = useState(row.country ?? "");
  // Whole units in the box, minor units in the database.
  const [amount, setAmount] = useState((row.amountMinorUnits / 100).toString());
  const [currency, setCurrency] = useState(row.currency);
  const [source, setSource] = useState(row.source);
  const [coupon, setCoupon] = useState(row.couponCode ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);

    const edit: Record<string, unknown> = {};
    if (name.trim() !== (row.name ?? "")) edit.name = name;
    if (email.trim() !== row.email) edit.email = email;
    if (phone.trim() !== (row.phone ?? "")) edit.phone = phone.trim() || null;
    if (country.trim() !== (row.country ?? "")) edit.country = country;
    const minor = Math.round(Number(amount) * 100);
    if (Number.isFinite(minor) && minor !== row.amountMinorUnits) edit.amountMinorUnits = minor;
    if (currency.trim().toUpperCase() !== row.currency) edit.currency = currency;
    if (source !== row.source) edit.source = source;
    if (coupon.trim() !== (row.couponCode ?? "")) edit.couponCode = coupon.trim() || null;

    if (Object.keys(edit).length === 0) {
      setBusy(false);
      onClose();
      return;
    }

    try {
      const res = await fetch(`/api/admin/enrollments/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That didn't save.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
      setBusy(false);
    }
  }

  const amountChanged = Math.round(Number(amount) * 100) !== row.amountMinorUnits;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-90/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit the enrolment for ${row.email}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6">
        <div>
          <h2 className="font-noi-grotesk text-[17px] font-medium tracking-[-0.015em] text-neutral-90">
            Edit enrolment
          </h2>
          <p className="mt-0.5 font-noi-grotesk text-[13px] text-neutral-50">
            {new Date(row.createdAt).toLocaleString("en-GB")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Name</span>
            <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Email</span>
            <input
              className={FIELD}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Phone</span>
            <input
              className={FIELD}
              value={phone}
              placeholder="None"
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Country</span>
            <input
              className={FIELD}
              value={country}
              placeholder="e.g. IN"
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>Amount</span>
            <input
              className={FIELD}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Currency</span>
            <input
              className={FIELD}
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL}>Paid by</span>
            <select
              className={FIELD}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCES.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Coupon</span>
            <input
              className={FIELD}
              value={coupon}
              placeholder="None"
              onChange={(e) => setCoupon(e.target.value)}
            />
          </label>
        </div>

        {amountChanged && (
          <p className="rounded-lg bg-lime-30/20 px-3 py-2 font-noi-grotesk text-[13px] leading-[1.45] text-neutral-90">
            This changes the recorded amount from{" "}
            <strong>
              {row.currency} {(row.amountMinorUnits / 100).toFixed(2)}
            </strong>{" "}
            to{" "}
            <strong>
              {currency} {(Number(amount) || 0).toFixed(2)}
            </strong>
            , which moves your revenue totals.
          </p>
        )}

        {error && (
          <p role="alert" className="font-noi-grotesk text-[13px] text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full px-4 font-noi-grotesk text-[14px] text-neutral-50 transition-colors duration-150 hover:text-neutral-90"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-full bg-neutral-90 px-5 font-noi-grotesk text-[14px] font-medium text-white transition-colors duration-150 hover:bg-neutral-70 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
