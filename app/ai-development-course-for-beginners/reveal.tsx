"use client";

import { useEffect } from "react";

/**
 * The page's only script: scroll reveals, and its ground colour.
 *
 * Reveals are gated on a `data-lp-js` attribute on <html>, so with no
 * JavaScript at all nothing is ever hidden — hiding content and relying on a
 * script to show it again is how a landing page becomes a blank one.
 *
 * The gate goes on here, after hydration, and not from an inline script before
 * first paint: React compares every attribute on <html> when it hydrates, so
 * anything added earlier — class or data attribute alike — is reported as a
 * mismatch. To keep the first paint from blinking, whatever is already on
 * screen is marked revealed before the gate is set; only what is still below
 * the fold waits for the observer.
 *
 * The ground colour goes on html and body while the page is mounted, so the
 * overscroll at either end shows this page's grey rather than the marketing
 * site's white, and is put back on the way out.
 */
export function LandingRuntime() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      html: html.style.backgroundColor,
      body: body.style.backgroundColor,
      scheme: html.style.colorScheme,
    };
    html.style.backgroundColor = "#eaeaea";
    body.style.backgroundColor = "#eaeaea";
    html.style.colorScheme = "light";

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let observer: IntersectionObserver | null = null;

    if (reduced || !("IntersectionObserver" in window)) {
      for (const el of targets) el.classList.add("is-in");
    } else {
      const viewport = window.innerHeight;
      const pending: HTMLElement[] = [];
      for (const el of targets) {
        const box = el.getBoundingClientRect();
        if (box.top < viewport * 0.92 && box.bottom > 0) el.classList.add("is-in");
        else pending.push(el);
      }
      html.setAttribute("data-lp-js", "");

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-in");
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      for (const el of pending) observer.observe(el);
    }

    return () => {
      observer?.disconnect();
      html.removeAttribute("data-lp-js");
      html.style.backgroundColor = previous.html;
      body.style.backgroundColor = previous.body;
      html.style.colorScheme = previous.scheme;
    };
  }, []);

  return null;
}
