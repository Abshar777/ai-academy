import type { ReactNode } from "react";
import { AcademyAuthProvider } from "@/components/academy-auth";

/**
 * The session provider is mounted here rather than in the root layout: it is
 * only the course view that needs a signed-in session, and hoisting it would
 * cost every anonymous visitor to the marketing site a request on page load.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <AcademyAuthProvider>
      <main className="page-surface flex min-h-screen flex-col px-5 pt-28 pb-20 sm:px-6 md:pt-32 md:pb-24">
        {children}
      </main>
    </AcademyAuthProvider>
  );
}
