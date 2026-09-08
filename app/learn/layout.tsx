import type { ReactNode } from "react";
import { CourseWatermark } from "@/components/learn/course-watermark";

/**
 * The session provider used to live here. It now sits at the root
 * (app/layout.tsx), because checkout has to know whether the visitor already
 * owns the course — a question this layout could never answer for a page
 * outside it.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="page-surface flex min-h-screen flex-col px-5 pt-28 pb-20 sm:px-6 md:pt-32 md:pb-24">
        {children}
      </main>
      {/* Forensic identity overlay across the whole course area — signed-in only. */}
      <CourseWatermark />
    </>
  );
}
