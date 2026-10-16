"use client";

import { useStudentCount } from "@/lib/use-student-count";

/**
 * The student figure, as one quiet line.
 *
 * Shares lib/use-student-count.ts with the card on the pricing section and
 * /order, so the hero cannot end up quoting a different number from the one
 * further down the same page.
 *
 * Renders nothing at all until the figure arrives, rather than reserving a
 * space that sits empty — in the hero, a gap under the call to action reads
 * as something failing to load.
 */
export function StudentCountLine({ className = "" }: { className?: string }) {
  const student = useStudentCount();
  if (!student) return null;

  return (
    <p
      className={`inline-flex items-center gap-2 font-noi-grotesk text-[14px] leading-none tracking-[-0.015em] text-neutral-70 sm:text-[15px] ${className}`}
    >
      <span aria-hidden="true" className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-30 opacity-75 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-lime-30" />
      </span>
      <span className="font-sans-plomb text-[16px] font-semibold tracking-[-0.015em] text-neutral-90 tabular-nums sm:text-[17px]">
        {student.headline.toLocaleString("en-IN")}
      </span>
      successful students
    </p>
  );
}
