import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { DeltaWordmark } from "@/components/delta-logo";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminRequestAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-neutral-10">
      {/* Two rows rather than one. Brand, six sections and a logout button
          abreast needed more width than a laptop has: the name broke onto three
          lines, the last section clipped, and Logout left the screen entirely
          with nothing to scroll to it. */}
      <header className="border-b border-neutral-90/8 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between gap-4 pt-4 pb-3">
            <Link href="/admin" className="flex items-center gap-2.5" aria-label="Admin — Overview">
              <DeltaWordmark className="h-7 w-[74px] shrink-0 object-contain" />
              <span className="font-noi-grotesk text-[15px] tracking-[-0.015em] whitespace-nowrap text-neutral-50">
                Admin
              </span>
            </Link>
            <LogoutButton />
          </div>
          <div className="pb-2">
            <AdminNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
