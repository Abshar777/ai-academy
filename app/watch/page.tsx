import type { Metadata } from "next";
import Link from "next/link";
import { EPISODE_BLURB, EPISODE_TITLE } from "@/lib/episode";
import { WEBINAR_BOOKING_URL } from "@/lib/next-webinar";
import { VideoPlayer } from "@/components/video-player";

export const metadata: Metadata = {
  title: "Watch episode 1 free",
  description:
    "The full opening class of the Delta AI Academy programme, free to watch in Malayalam or English.",
};

export default function WatchPage() {
  return (
    <main className="page-surface flex min-h-screen flex-col items-center px-5 pt-28 pb-20 sm:px-6 md:pt-36 md:pb-28">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 text-center">
          <span className="mx-auto inline-block rounded-full bg-neutral-10 px-5 py-2.5 font-noi-grotesk text-[14px] leading-[1.5]">
            Free episode
          </span>
          <h1 className="font-noi-grotesk text-[32px] leading-[1.1] tracking-[-0.025em] text-balance md:text-[40px]">
            {EPISODE_TITLE}
          </h1>
          <p className="mx-auto max-w-xl font-noi-grotesk text-[16px] leading-[1.45] tracking-[-0.015em] text-pretty text-neutral-50 md:text-[18px]">
            {EPISODE_BLURB}
          </p>
        </div>

        <VideoPlayer className="shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]" />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={WEBINAR_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-full bg-lime-30 px-7 font-noi-grotesk text-[15px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 active:scale-[0.98]"
          >
            Book the free webinar
          </a>
          <Link
            href="/order"
            className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-90 px-7 font-noi-grotesk text-[15px] leading-none font-semibold transition duration-150 ease-in-out hover:bg-neutral-90/8"
          >
            Join the programme
          </Link>
        </div>
      </div>
    </main>
  );
}
