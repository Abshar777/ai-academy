"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAcademyAuth } from "./academy-auth";

/**
 * Sends someone who already owns the course to it, instead of showing them a
 * page asking them to buy it again.
 *
 * The check is on the entitlement, not on being signed in: an account with no
 * purchase behind it is exactly who checkout is for, and bouncing them would
 * make the programme impossible to buy for anyone who had ever signed in.
 *
 * Renders nothing. The form stays on screen and interactive until the check
 * comes back, so the ordinary visitor — signed out, no session to look up —
 * never waits on it.
 */
export function AlreadyEnrolledGuard() {
  const { status, apiFetch } = useAcademyAuth();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (status !== "authed") return;
    let cancelled = false;

    // Deferred a tick, matching the pattern used elsewhere here: the lint rule
    // flags a setState the effect body can reach synchronously.
    const id = window.setTimeout(async () => {
      try {
        const response = await apiFetch("/me");
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { courses?: unknown[] };
        if (cancelled || !data.courses?.length) return;
        setLeaving(true);
        router.replace("/learn");
      } catch {
        // Leave them on checkout. Failing to confirm a purchase is not a
        // reason to block someone from making one.
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [status, apiFetch, router]);

  if (!leaving) return null;

  return (
    <div
      role="status"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white/85 backdrop-blur-sm"
    >
      <p className="font-noi-grotesk text-[15px] leading-[1.45] tracking-[-0.015em] text-neutral-50">
        You&rsquo;re already enrolled — opening your course&hellip;
      </p>
    </div>
  );
}
