"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Muted looping preview of the finished project. Autoplay is skipped when the
 * visitor asks for reduced motion — they get the first frame instead.
 */
export function ProjectMedia({
  src,
  poster,
  alt,
}: {
  src: string;
  poster?: string;
  alt: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (query.matches) video.pause();
      else void video.play().catch(() => {});
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  if (src.endsWith(".webp")) {
    return (
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={960}
        className="h-full w-full rounded-2xl object-cover"
      />
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={alt}
      className="h-full w-full rounded-2xl object-cover"
    />
  );
}
