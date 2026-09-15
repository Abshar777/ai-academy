"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Blog", href: "/admin/blog" },
  { label: "Devices", href: "/admin/devices" },
  { label: "Seminar", href: "/admin/seminar" },
];

/**
 * Admin sections.
 *
 * Scrolls sideways rather than wrapping or clipping: six labels do not fit on a
 * phone, and the previous single row put Seminar half off the edge with no way
 * to reach it. The negative margin lets the scrolling strip run to both edges
 * of the screen while its contents stay aligned with the page gutter.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="-mx-6 flex items-center gap-1 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {NAV.map((item) => {
        // Overview is every other page's prefix, so it only counts on an exact
        // match — otherwise it would look active from inside Payments.
        const active =
          item.href === "/admin" ? pathname === "/admin" : (pathname?.startsWith(item.href) ?? false);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-noi-grotesk text-[14px] whitespace-nowrap transition-colors duration-150 ${
              active
                ? "bg-neutral-90 text-white"
                : "text-neutral-50 hover:bg-neutral-90/6 hover:text-neutral-90"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
