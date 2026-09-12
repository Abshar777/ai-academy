import type { Metadata } from "next";
import { SeminarForm, SeminarPoster } from "@/components/seminar-form";
import { nextWebinarSession } from "@/lib/next-webinar";

export const metadata: Metadata = {
  title: "Free live seminar",
  description:
    "Book a free seat at the next Delta AI Academy live seminar. Build a website in minutes with AI — no coding experience needed.",
};

/**
 * Registration for the free seminar, replacing the Typeform this used to be
 * handed off to. Doing it here is what makes the rest possible: the calendar
 * invite, the WhatsApp community hand-off, and knowing who actually booked.
 *
 * Dynamic rather than static: the session is chosen by comparing against the
 * current time, and a statically-rendered page would bake in whichever session
 * was next at build time and keep advertising it after it had passed.
 */
export const dynamic = "force-dynamic";

export default function SeminarPage() {
  const session = nextWebinarSession();

  return (
    <main className="page-surface flex min-h-screen items-start justify-center overflow-x-clip px-6 pt-28 pb-20 md:pt-36 md:pb-32">
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <SeminarPoster session={session} />
          {session && (
            <ul className="flex flex-col gap-3 rounded-3xl bg-neutral-10 p-8 md:p-10">
              {[
                "Build and publish a real website during the session",
                "No coding experience needed — you direct the AI",
                "Live on Google Meet, with your questions answered",
                "Free, and the recording is not the point — come live",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 font-noi-grotesk text-[15px] leading-[1.45] tracking-[-0.015em]"
                >
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lime-40" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        <SeminarForm session={session} />
      </div>
    </main>
  );
}
