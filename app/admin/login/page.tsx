"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Single shared-password login for the admin panel (app/admin/(protected)) —
 * see lib/admin-auth.ts. No accounts, no email — one password set via
 * ADMIN_PASSWORD, sized for a single business owner running this panel.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not log in.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not log in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-10 px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-8 shadow-[0_16px_48px_rgb(0_0_0_/_0.08)]"
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-noi-grotesk text-[22px] leading-[1.1] font-medium tracking-[-0.015em] text-neutral-90">
            Admin
          </h1>
          <p className="font-noi-grotesk text-[14px] leading-[1.4] text-neutral-50">
            Delta AI Academy
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="admin-password"
            className="font-noi-grotesk text-[14px] font-medium tracking-[-0.015em] text-neutral-90"
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            className="h-11 w-full rounded-lg border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[15px] outline-none focus:border-neutral-90"
          />
        </div>

        {error && (
          <p role="alert" className="font-noi-grotesk text-[13px] text-[#c0392b]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-neutral-90 font-noi-grotesk text-[15px] font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
