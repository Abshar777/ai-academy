"use client";

import { useState } from "react";
import {
  MAX_DEVICES,
  MIN_DEVICES,
  type DeviceSettings,
} from "@/lib/device-limits";
import { Spinner } from "./spinner";

/**
 * The switch that decides whether the device whitelist is enforced, and how
 * many devices it allows.
 *
 * It changes who can open paid content, so it says what it is doing in plain
 * words rather than leaving an admin to infer it from a toggle, and it asks
 * before switching enforcement off.
 */
export function DeviceSettingsPanel({ initial }: { initial: DeviceSettings }) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  async function save(patch: Partial<DeviceSettings>, revert: DeviceSettings) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/devices/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => null)) as (DeviceSettings & { error?: string }) | null;
      if (!res.ok || !data || data.error) {
        setSettings(revert);
        setMessage({ tone: "warn", text: data?.error ?? "Could not save that." });
        return;
      }
      setSettings({ enabled: data.enabled, maxApproved: data.maxApproved });
      setMessage({ tone: "ok", text: "Saved — it applies within a few seconds." });
    } catch {
      setSettings(revert);
      setMessage({ tone: "warn", text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    const next = !settings.enabled;
    if (
      !next &&
      !window.confirm(
        "Turn the device limit off?\n\nAnyone will be able to sign in from any number of devices, " +
          "so one purchase can be shared freely. Devices you have revoked stay revoked.",
      )
    ) {
      return;
    }
    const previous = settings;
    setSettings({ ...settings, enabled: next });
    void save({ enabled: next }, previous);
  }

  function changeLimit(value: number) {
    const previous = settings;
    setSettings({ ...settings, maxApproved: value });
    void save({ maxApproved: value }, previous);
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-noi-grotesk text-[15px] font-medium text-neutral-90">Device limit</h2>
          <p className="mt-0.5 max-w-[60ch] font-noi-grotesk text-[13px] leading-[1.45] text-neutral-50">
            {settings.enabled
              ? `Each buyer may sign in on ${settings.maxApproved} device${settings.maxApproved === 1 ? "" : "s"}. The first is approved automatically; the rest wait for you here.`
              : "Off — anyone can sign in from any number of devices. Devices you have revoked stay revoked."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {busy && <Spinner className="text-neutral-50" />}
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-pressed={settings.enabled}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-noi-grotesk text-[12px] font-semibold tracking-[0.02em] transition-colors duration-150 disabled:opacity-60 ${
              settings.enabled
                ? "bg-lime-30 text-neutral-90 hover:bg-lime-40"
                : "bg-neutral-90/10 text-neutral-70 hover:bg-neutral-90/20"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${settings.enabled ? "bg-neutral-90" : "bg-neutral-50"}`}
            />
            {settings.enabled ? "Enforced" : "Off"}
          </button>
        </div>
      </div>

      {settings.enabled && (
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-90/8 pt-4">
          <label className="font-noi-grotesk text-[13px] text-neutral-50" htmlFor="device-limit">
            Devices per buyer
          </label>
          <select
            id="device-limit"
            value={settings.maxApproved}
            disabled={busy}
            onChange={(e) => changeLimit(Number(e.target.value))}
            className="h-9 rounded-full border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[13px] text-neutral-90 outline-none transition-colors duration-150 focus:border-neutral-90 disabled:opacity-60"
          >
            {Array.from({ length: MAX_DEVICES - MIN_DEVICES + 1 }, (_, i) => MIN_DEVICES + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <p className="font-noi-grotesk text-[12px] text-neutral-50">
            Lowering this never signs anyone out — it only refuses the next new device.
          </p>
        </div>
      )}

      {message && (
        <p className={`font-noi-grotesk text-[13px] ${message.tone === "ok" ? "text-[#5d7a00]" : "text-[#c0392b]"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
