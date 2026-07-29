"use client";

import { useEffect, useRef } from "react";

/**
 * Compact looping video preview — same lazy-play-near-viewport behaviour as
 * ClassPreview in pricing-section.tsx (reusing the same /video.mp4 asset),
 * just sized down for a sidebar slot on /order instead of a full section.
 */
export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let near = false;

    const apply = () => {
      if (!near) return;
      if (query.matches) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) apply();
        else video.pause();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(video);
    query.addEventListener("change", apply);

    return () => {
      observer.disconnect();
      query.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div className="group relative flex aspect-video w-full items-end overflow-hidden rounded-2xl">
      <video
        ref={videoRef}
        src="/video.mp4"
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,0.55)_100%)]"
        aria-hidden
      />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 transition-transform duration-300 group-hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="#171717" aria-hidden>
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      </span>
      <span className="relative z-10 p-4 font-noi-grotesk text-[14px] leading-[1.3] font-medium tracking-[-0.015em] text-white">
        See a class before you join
      </span>
    </div>
  );
}
