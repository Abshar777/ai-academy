"use client";

import { usePlanLabel } from "@/lib/use-plan-price";

/**
 * Renders just the country-aware price label. A client island so the
 * server-rendered sections (hero.tsx's stat strip, curriculum-preview.tsx's
 * summary line) can quote the live price without the route going dynamic to
 * read cookies — see lib/use-plan-price.ts.
 */
export function PlanPrice() {
  return <>{usePlanLabel()}</>;
}
