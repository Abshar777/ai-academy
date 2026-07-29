"use client";

import { useEffect, useRef, useState } from "react";
import { ContactButton } from "./contact-dialog";
import Link from "next/link";
import { DeltaWordmark } from "./delta-logo";

/** Matches the desktop bar, so both collapse at the same point. */
const CONDENSE_AT = 50;

const NAV = [
  { label: "Program", href: "#program" },
  { label: "What you'll learn", href: "#learn" },
  { label: "Projects", href: "#projects" },
  { label: "AI tools", href: "#tools" },
  { label: "Pricing", href: "#pricing" },
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

  // Written straight to the DOM so the transition starts on the same frame as
  // the scroll, exactly as the desktop bar does.
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
      className={`site-nav mobile-nav relative z-50 h-full xl:hidden  `}
    >
      {open && <div className="abosulte bg-white w-screen h-screen top-0 left-0"></div>}
      <div className={`mobile-nav-bar fixed top-(--mobile-top-offset) left-1/2 h-(--mobile-nav-height) w-[calc(100vw-var(--mobile-nav-offset))] -translate-x-1/2 rounded-xl p-(--nav-padding) ${open&&"w-full h-full p-4 shadow-none"}`}>
        <div className="flex h-[calc(var(--mobile-nav-height)-var(--nav-padding)*2)] w-full items-center justify-between">
          <Link
            href="/"
            aria-label="Delta AI Academy home"
            className="relative flex h-8 items-center"
          >
            {/* Full wordmark at every scroll position — no crossfade to the
                mark here, unlike the desktop bar. */}
            <span className="site-nav-logo relative flex h-8 items-center overflow-hidden">
              <DeltaWordmark
                className="site-nav-wordmark absolute left-0 h-8 w-[85px] object-contain"
                priority={false}
              />
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-4 w-6 items-center justify-end"
          >
            <MenuIcon open={open} />
          </button>
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
                className="flex items-center justify-between py-5 font-noi-grotesk text-[24px] leading-[1.15] tracking-[-0.025em]"
              >
                {item.label}
                <svg viewBox="0 0 16 16" className="size-4 shrink-0 opacity-35" aria-hidden>
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
          <ContactButton
            source="mobile-nav"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-5 text-[16px] leading-none font-medium text-white"
          >
            Join now
          </ContactButton>
          <ContactButton
            source="mobile-nav"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-neutral-90 px-5 text-[16px] leading-none font-medium"
          >
            Brochure
          </ContactButton>
        </div>
      </div>
    </nav>
  );
}
