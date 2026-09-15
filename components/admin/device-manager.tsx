"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "./data-table";

export type DeviceView = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: "approved" | "pending" | "revoked";
  isMain: boolean;
  label: string | null;
  ip: string | null;
  createdAt: string;
  approvedAt: string | null;
  lastSeenAt: string | null;
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

const STATUS_STYLE: Record<DeviceView["status"], string> = {
  approved: "bg-lime-30/25 text-neutral-90",
  pending: "bg-amber-100 text-amber-800",
  revoked: "bg-neutral-90/10 text-neutral-50",
};

function StatusBadge({ status, isMain }: { status: DeviceView["status"]; isMain: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 font-noi-grotesk text-[12px] font-medium ${STATUS_STYLE[status]}`}
      >
        {status}
      </span>
      {isMain ? (
        <span className="inline-flex items-center rounded-full bg-neutral-90/8 px-2 py-0.5 font-noi-grotesk text-[11px] text-neutral-50">
          main
        </span>
      ) : null}
    </span>
  );
}

const BTN =
  "inline-flex h-8 items-center rounded-full px-3 font-noi-grotesk text-[13px] font-medium transition-colors disabled:opacity-50";

export function DeviceManager({ initialDevices }: { initialDevices: DeviceView[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pending = useMemo(() => devices.filter((d) => d.status === "pending"), [devices]);
  const approvedByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of devices) if (d.status === "approved") map.set(d.userId, (map.get(d.userId) ?? 0) + 1);
    return map;
  }, [devices]);

  async function act(id: string, action: "approve" | "revoke") {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/devices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not update the device.");
        return;
      }
      const status = action === "approve" ? "approved" : "revoked";
      setDevices((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, status, approvedAt: action === "approve" ? new Date().toISOString() : d.approvedAt }
            : d,
        ),
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const deviceColumns = useMemo<Column<DeviceView>[]>(
    () => [
      {
        key: "buyer",
        header: "Buyer",
        className: "align-top",
        cell: (d) => (
          <>
            <p className="font-noi-grotesk text-[14px] text-neutral-90">{d.email}</p>
            {d.phone ? (
              <p className="font-noi-grotesk text-[12px] text-neutral-50">{d.phone}</p>
            ) : null}
          </>
        ),
        search: (d) => `${d.email} ${d.phone ?? ""} ${d.name ?? ""}`,
      },
      {
        key: "device",
        header: "Device",
        className: "align-top font-noi-grotesk text-[13px] text-neutral-70",
        cell: (d) => (
          <>
            {d.label ?? "Unknown device"}
            {d.ip ? <span className="block text-neutral-50">{d.ip}</span> : null}
          </>
        ),
        search: (d) => `${d.label ?? ""} ${d.ip ?? ""}`,
      },
      {
        key: "status",
        header: "Status",
        className: "align-top",
        cell: (d) => <StatusBadge status={d.status} isMain={d.isMain} />,
        search: (d) => d.status,
      },
      {
        key: "lastSeen",
        header: "Last seen",
        className: "align-top font-noi-grotesk text-[13px] text-neutral-50",
        cell: (d) => (d.lastSeenAt ? timeAgo(d.lastSeenAt) : "—"),
      },
      {
        key: "action",
        header: "Action",
        className: "text-right align-top",
        cell: (d) => {
          const atLimit = (approvedByUser.get(d.userId) ?? 0) >= 2;
          if (d.status === "approved") {
            return (
              <button
                className={`${BTN} bg-neutral-90/8 text-neutral-70 hover:bg-neutral-90/15`}
                disabled={busy === d.id}
                onClick={() => act(d.id, "revoke")}
              >
                Revoke
              </button>
            );
          }
          if (d.status === "revoked") {
            return (
              <button
                className={`${BTN} bg-neutral-90 text-white hover:bg-neutral-100`}
                disabled={busy === d.id || atLimit}
                title={atLimit ? "Buyer already has 2 approved devices" : undefined}
                onClick={() => act(d.id, "approve")}
              >
                Re-approve
              </button>
            );
          }
          return <span className="font-noi-grotesk text-[13px] text-neutral-40">—</span>;
        },
      },
    ],
    // `act` is redefined every render; the rest is what actually changes a cell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvedByUser, busy],
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-noi-grotesk text-[22px] font-medium tracking-[-0.02em] text-neutral-90">
          Devices
        </h1>
        <p className="mt-1 font-noi-grotesk text-[14px] text-neutral-50">
          Buyers may use two devices. The first is auto-approved; a second needs your approval here.
          Revoking a device frees a slot and ends its session within minutes.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 font-noi-grotesk text-[14px] text-red-700">
          {error}
        </div>
      ) : null}

      {/* Pending requests — the ones needing action. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-noi-grotesk text-[15px] font-medium text-neutral-90">
          Pending requests{pending.length ? ` (${pending.length})` : ""}
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[14px] text-neutral-50 ring-1 ring-neutral-90/8">
            No devices waiting for approval.
          </div>
        ) : (
          <ul className="flex list-none flex-col gap-2">
            {pending.map((d) => {
              const atLimit = (approvedByUser.get(d.userId) ?? 0) >= 2;
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-amber-200"
                >
                  <div className="min-w-0">
                    <p className="font-noi-grotesk text-[14px] font-medium text-neutral-90">
                      {d.email}
                      {d.phone ? <span className="text-neutral-50"> · {d.phone}</span> : null}
                    </p>
                    <p className="mt-0.5 font-noi-grotesk text-[13px] text-neutral-50">
                      {d.label ?? "Unknown device"}
                      {d.ip ? ` · ${d.ip}` : ""} · requested {timeAgo(d.createdAt)}
                      {atLimit ? " · buyer already has 2 approved" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className={`${BTN} bg-neutral-90 text-white hover:bg-neutral-100`}
                      disabled={busy === d.id || atLimit}
                      title={atLimit ? "Revoke one of this buyer's devices first" : undefined}
                      onClick={() => act(d.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className={`${BTN} bg-neutral-90/8 text-neutral-70 hover:bg-neutral-90/15`}
                      disabled={busy === d.id}
                      onClick={() => act(d.id, "revoke")}
                    >
                      Deny
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* All devices. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-noi-grotesk text-[15px] font-medium text-neutral-90">All devices</h2>
        <DataTable
          rows={devices}
          columns={deviceColumns}
          filterPlaceholder="Filter by buyer, device, status…"
          empty="No devices yet."
          minWidth={680}
        />
      </section>
    </div>
  );
}
