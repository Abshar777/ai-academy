import { seminarIcs } from "@/lib/seminar-ics";
import { plainInvite } from "@/lib/seminar-invite";
import { nextWebinarSession } from "@/lib/next-webinar";
import { sessionEventId } from "@/lib/seminar-registrations";

/** Mongo and node:crypto — not edge. */
export const runtime = "nodejs";
/** Follows the schedule, so it cannot serve a seminar that has been and gone. */
export const dynamic = "force-dynamic";

/**
 * The seminar as a calendar file anyone can add, without registering first.
 *
 * Exists to be shared — in the WhatsApp community, in a caption, anywhere a
 * link goes. A Google Calendar "TEMPLATE" link only works for someone already
 * signed in to Google, and bounces everyone else to a marketing page; an
 * iPhone on Apple Calendar never gets there at all. A .ics is understood by
 * Google Calendar, Apple Calendar and Outlook alike.
 *
 * It carries the registration page rather than the Meet link. The Meet link is
 * what a booked seat buys you, and putting it in a public file hands out the
 * room to anyone forwarded the message — along with any idea of who is coming.
 *
 * The UID matches the real event where one exists, so somebody who adds this
 * and later registers ends up with one entry in their calendar, not two.
 */
export async function GET() {
  const session = nextWebinarSession();
  if (!session) {
    return new Response("No seminar is scheduled.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const ics = seminarIcs({
    eventId: await sessionEventId(session.startsAt),
    title: `Delta AI Academy — ${session.title}`,
    description: plainInvite(session),
    location: "https://deltaaiacademy.ai/seminar",
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    organizerName: "Delta AI Academy",
    organizerEmail: "support@deltagroups.ae",
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Named so the phone shows the seminar rather than "event.ics".
      "Content-Disposition": 'inline; filename="delta-ai-academy-seminar.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
