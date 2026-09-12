import type { Metadata } from "next";
import { SeminarForm, SeminarPoster } from "@/components/seminar-form";
import { formatWebinarDate, formatWebinarTime, nextWebinarSession } from "@/lib/next-webinar";

/**
 * The share card is the poster itself, rather than the site-wide card from
 * app/opengraph-image.tsx. This link gets sent in WhatsApp more than anywhere
 * else, and the poster already says the thing the preview needs to say —
 * what it is, the date, the time and who is running it — in the language the
 * people receiving it read it in.
 *
 * Generated per request rather than declared statically so it follows the
 * session: a new seminar brings a new poster, and the preview changes with it
 * instead of advertising the last one.
 */
export async function generateMetadata(): Promise<Metadata> {
  const session = nextWebinarSession();
  const title = session ? `${session.title} — free live seminar` : "Free live seminar";
  const description = session
    ? `${formatWebinarDate(new Date(session.startsAt))} at ${formatWebinarTime(new Date(session.startsAt))}, live on Google Meet with ${session.speaker}. Free — no card needed.`
    : "Book a free seat at the next Delta AI Academy live seminar. Build a website in minutes with AI — no coding experience needed.";

  // Portrait, because it is the poster. WhatsApp renders it as a large
  // preview; the dimensions are declared so it does not have to fetch the
  // image to work out the layout.
  const images = session
    ? [{ url: session.poster, width: 1080, height: 1350, alt: session.title }]
    : undefined;

  return {
    title,
    description,
    openGraph: { type: "website", url: "/seminar", title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

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
