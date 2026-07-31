import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/logout-button";

const NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Coupons", href: "/admin/coupons" },
];

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminRequestAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-neutral-10">
      <header className="border-b border-neutral-90/8 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="font-noi-grotesk text-[15px] font-medium tracking-[-0.015em] text-neutral-90">
              Delta AI Academy — Admin
            </span>
            <nav className="flex items-center gap-5">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-noi-grotesk text-[14px] text-neutral-50 transition-colors duration-150 hover:text-neutral-90"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
