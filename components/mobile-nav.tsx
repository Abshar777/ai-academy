"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrochureLink } from "./brochure-link";
import Link from "next/link";
import { DeltaLogo, DeltaWordmark } from "./delta-logo";
import { useIntroComplete } from "@/lib/intro";

/** Matches the desktop bar, so both collapse at the same point. */
const CONDENSE_AT = 50;

/** Scroll depth before the bar is allowed to hide at all. */
const FREE_SCROLL = 140;

/** Pixels of travel before a direction change counts. */
const DIRECTION_THRESHOLD = 6;

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

/** Three rules that rotate into an X. Matches the reference's 15×11 mark. */
function MenuIcon({ open }: { open: boolean }) {
  const line =
    "origin-center transition-transform duration-300 ease-[cubic-bezier(0.65,0,0.1,1)] [transform-box:fill-box]";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 15 11"
      fill="none"
      aria-hidden
    >
      <path
        d="M0 1.25H15"
        stroke="currentColor"
        strokeWidth="1.25"
        className={line}
        style={
          open
            ? { transform: "translateY(4.25px) rotate(45deg)" }
            : { transform: "none" }
        }
      />
      <path
        d="M0 5.5H15"
        stroke="currentColor"
        strokeWidth="1.25"
        className={line + " transition-opacity"}
        style={{ opacity: open ? 0 : 1 }}
      />
      <path
        d="M0 9.75H15"
        stroke="currentColor"
        strokeWidth="1.25"
        className={line}
        style={
          open
            ? { transform: "translateY(-4.25px) rotate(-45deg)" }
            : { transform: "none" }
        }
      />
    </svg>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const introDone = useIntroComplete();

  // Written straight to the DOM so the transition starts on the same frame as
  // the scroll, exactly as the desktop bar does.
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;

    let lastY = window.scrollY;
    let queued = false;

    const apply = () => {
      queued = false;
      const y = window.scrollY;
      nav.dataset.condensed = String(y > CONDENSE_AT);

      // Small screens are short, so the bar gets out of the way on the way
      // down and comes back the moment you head up. Never hides near the top,
      // and never while the drawer is open.
      if (nav.dataset.menuOpen !== "true" && y > FREE_SCROLL) {
        if (y > lastY + DIRECTION_THRESHOLD) nav.dataset.hidden = "true";
        else if (y < lastY - DIRECTION_THRESHOLD) nav.dataset.hidden = "false";
      } else {
        nav.dataset.hidden = "false";
      }

      // Ignore sub-threshold jitter, so a 1px wobble doesn't flip the bar.
      if (Math.abs(y - lastY) > DIRECTION_THRESHOLD) lastY = y;
    };

    // Coalesced into a frame: scroll fires far more often than we can paint.
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Opening the drawer always brings the bar back — its close button lives in
  // it, so it can never be off-screen while open.
  useEffect(() => {
    if (open && ref.current) ref.current.dataset.hidden = "false";
  }, [open]);

  // The drawer covers the viewport, so the page behind it shouldn't scroll.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <nav
      ref={ref}
      aria-label="Main"
      data-condensed="false"
      data-menu-open={open}
      data-hidden="false"
      data-entered={introDone}
      className={`site-nav mobile-nav relative z-50 h-full xl:hidden  `}
      // Open, the header carries the full stacked lockup instead of the
      // wordmark, which needs more height than the collapsed bar has. Both
      // the header row and the drawer's top edge are derived from this var,
      // so overriding it here moves them together — hardcoding a taller row
      // alone would leave the drawer painting over the logo.
      style={open ? ({ "--mobile-nav-height": "5rem" } as CSSProperties) : undefined}
    >
      <div className={`mobile-nav-bar fixed top-(--mobile-top-offset) left-1/2 h-(--mobile-nav-height) w-[calc(100vw-var(--mobile-nav-offset))] -translate-x-1/2 rounded-xl p-(--nav-padding) ${open&&"w-full h-full p-4 shadow-none"}`}>
        <div className="flex h-[calc(var(--mobile-nav-height)-var(--nav-padding)*2)] w-full items-center justify-between">
          <Link
            href="/"
            aria-label="Delta AI Academy home"
            className={"relative flex items-center " + (open ? "h-12" : "h-8")}
          >
            {/* Open, there's room for the full stacked lockup; collapsed into
                the bar there is only height for the wordmark. */}
            {open ? (
              <DeltaLogo className="h-12 w-auto object-contain" />
            ) : (
              <span className="site-nav-logo relative flex h-8 items-center overflow-hidden">
                <DeltaWordmark
                  className="site-nav-wordmark absolute left-0 h-8 w-[85px] object-contain"
                  priority={false}
                />
              </span>
            )}
          </Link>

          <div className="flex items-center gap-4">
            {/* The one action worth reaching without opening the drawer.
                Hidden while the drawer is open — it offers the same thing. */}
            {!open && (
              <Link
                href="/order"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-lime-30 px-4 text-[14px] leading-none font-medium tracking-[-0.015em] text-black transition duration-150 ease-in-out active:scale-[0.97]"
              >
                Join now
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="flex h-4 w-6 items-center justify-end transition-transform duration-150 ease-out active:scale-90"
            >
              <MenuIcon open={open} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={
          "mobile-drawer fixed inset-x-0 top-[calc(var(--mobile-top-offset)+var(--mobile-nav-height))] h-[calc(100dvh-var(--mobile-top-offset)-var(--mobile-nav-height))] w-screen overflow-y-auto bg-white px-6 pb-10 text-neutral-90 " +
          (open ? "" : "pointer-events-none")
        }
        data-open={open}
        aria-hidden={!open}
      >
        <ul className="flex list-none flex-col pt-4">
          {NAV.map((item, i) => (
            <li
              key={item.label}
              className="mobile-drawer-item border-b border-neutral-90/8"
              style={{ ["--i" as string]: String(i) }}
            >
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between py-5 font-noi-grotesk text-[26px] leading-[1.15] tracking-[-0.025em] active:translate-x-1 active:transition-transform active:duration-150"
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-noi-grotesk text-[13px] font-medium tabular-nums text-neutral-90/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </span>
                <svg
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0 opacity-35 transition-transform duration-200 ease-out group-active:translate-x-1"
                  aria-hidden
                >
                  <path
                    d="M5 3l6 5-6 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>

        <div
          className="mobile-drawer-item mt-10 flex flex-col gap-3"
          style={{ ["--i" as string]: String(NAV.length) }}
        >
          <Link
            href="/order"
            onClick={() => setOpen(false)}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-5 text-[16px] leading-none font-medium text-white"
          >
            Join now
          </Link>
          <BrochureLink className="inline-flex h-12 items-center justify-center rounded-lg border border-neutral-90 px-5 text-[16px] leading-none font-medium">
            Brochure
          </BrochureLink>
        </div>
      </div>
    </nav>
  );
}
