"use client";

import { useEffect, useState } from "react";

/**
 * The student figure the marketing pages quote.
 *
 * One hook because three places now show it — the hero, the pricing card and
 * the order page — and three components each fetching and each adding their
 * own number is how two of them end up disagreeing on the same screen.
 *
 * What it returns is the real enrolment count from app/api/students-count
 * plus HEADLINE_BASE. The base is a marketing figure, not a measurement: the
 * API number is the real one, and anything shown to a visitor is that plus a
 * constant chosen by the business. Kept named and in one place so it is
 * obvious what the displayed number is made of.
 */

/** Added to the real enrolment count before display. */
export const HEADLINE_BASE = 10_000;

/** Below this the real count is too small to carry the claim, and nothing is
 *  shown at all rather than a number that argues against the copy. */
export const MIN_COUNT_TO_SHOW = 25;

export type StudentCount = {
  /** Real enrolments, straight from the database. */
  actual: number;
  /** What a visitor sees: actual + HEADLINE_BASE. */
  headline: number;
};

export function useStudentCount(): StudentCount | null {
  const [count, setCount] = useState<StudentCount | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/students-count")
      .then((res) => res.json())
      .then((data: { count?: unknown }) => {
        if (cancelled || typeof data?.count !== "number") return;
        if (data.count < MIN_COUNT_TO_SHOW) return;
        setCount({ actual: data.count, headline: data.count + HEADLINE_BASE });
      })
      .catch(() => {
        // Best effort. Every caller renders fine without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
