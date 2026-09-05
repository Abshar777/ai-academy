"use client";

import { useEffect, useRef } from "react";
import { BrochureLink } from "./brochure-link";
import Link from "next/link";
import { DeltaWordmark, DeltaMark } from "./delta-logo";
import { MobileNav } from "./mobile-nav";
import { useIntroComplete } from "@/lib/intro";

// Prefixed with "/" rather than a bare "#...": the header now renders on
// every route via the root layout, so a bare hash would try to scroll the
// CURRENT page (e.g. /course) instead of jumping back to the homepage
// section it actually names.
const NAV = [
  { label: "Program", href: "/#program" },
  { label: "What you'll learn", href: "/#learn" },
  { label: "Projects", href: "/#projects" },
  { label: "Curriculum", href: "/course" },
  { label: "AI tools", href: "/#tools" },
  { label: "Pricing", href: "/#pricing" },
];

/** Scroll distance before the bar collapses into the floating pill. */
const CONDENSE_AT = 50;

export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);
  // The bar drops in with the curtain rather than being there already.
  const introDone = useIntroComplete();

  // Written straight to the DOM rather than through state: the width and
  // colour transitions then begin on the same frame as the scroll.
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const onScroll = () => {
      nav.dataset.condensed = String(window.scrollY > CONDENSE_AT);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <MobileNav />
      <nav
        ref={ref}
        aria-label="Main"
        data-condensed="false"
        data-entered={introDone}
        className="site-nav fixed inset-x-0 top-(--desktop-nav-top-offset) z-50 hidden h-(--desktop-nav-height) justify-center xl:flex"
      >
        <div className="flex w-[calc(100%-var(--nav-offset))] justify-center">
          <div className="site-nav-bar flex items-center rounded-2xl py-2">
            <div className="relative m-0 flex size-full items-center justify-between px-2">
              <Link
                href="/"
                aria-label="Delta AI Academy home"
                className="relative flex shrink-0"
              >
                {/* Wordmark and monogram crossfade, so the logo never squashes. */}
                <span className="site-nav-logo relative flex h-7 items-center overflow-hidden">
                  <DeltaWordmark className="site-nav-wordmark absolute left-0 h-7 w-[74px] object-contain" />
                  <DeltaMark className="site-nav-mark absolute left-0 h-7 w-[20px] object-contain" />
                </span>
              </Link>

              <ul className="m-0 hidden list-none items-center justify-center xl:flex">
                {NAV.map((item) => (
                  <li key={item.label} className="relative flex items-center">
                    <Link
                      href={item.href}
                      className="site-nav-link rounded-lg px-4 py-3 text-[14px] leading-[1.4] tracking-[-0.015em] whitespace-nowrap transition-colors duration-400"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex shrink-0 items-center gap-2">
                <BrochureLink className="inline-flex h-10 items-center justify-center rounded-lg border border-current px-4 text-[14px] leading-[1.1] font-medium tracking-[-0.015em] transition duration-150 ease-in-out hover:bg-current/10">
                  Brochure
                </BrochureLink>
                <Link
                href="/order"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-lime-30 px-4 text-[14px] leading-[1.1] font-medium tracking-[-0.015em] text-black transition duration-150 ease-in-out hover:bg-lime-40"
              >
                Join now
              </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
