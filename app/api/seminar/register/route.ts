import { NextResponse } from "next/server";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { formatWebinarDate, formatWebinarTime, nextWebinarSession } from "@/lib/next-webinar";
import {
  markSeminarInvited,
  recordSeminarRegistration,
  refreshSessionMeetLink,
  sessionEvent,
} from "@/lib/seminar-registrations";
import { addSeminarGuest } from "@/lib/google-calendar";
import { sendSeminarConfirmationEmail } from "@/lib/email";
import { notifyAdminWhatsApp, notifySeminarWhatsApp } from "@/lib/whatsapp";

/** Signing the Google JWT needs node:crypto, and Mongo and nodemailer are
 *  node-only too — this cannot run on the edge runtime. */
export const runtime = "nodejs";

/**
 * Books a seat at the next free seminar.
 *
 * The registration is recorded first and everything after it is best effort. A
 * calendar invite that fails to send is worth logging and retrying; it is not a
 * reason to tell someone their booking failed, when the seat is already theirs
 * and the joining link is on the screen in front of them.
 */
export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; phone?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";

  if (!isValidName(name)) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });

  const session = nextWebinarSession();
  if (!session) {
    return NextResponse.json(
      { error: "There's no seminar scheduled right now. Check back soon." },
      { status: 409 },
    );
  }

  const start = new Date(session.startsAt);
  const when = `${formatWebinarDate(start)} · ${formatWebinarTime(start)}`;
  const communityUrl = process.env.WHATSAPP_COMMUNITY_URL || null;

  const { created } = await recordSeminarRegistration({
    name,
    email,
    phone,
    country,
    startsAt: session.startsAt,
  });

  // What a registrant reads inside their calendar entry days later, with none
  // of this page in front of them.
  const description = [
    `${session.title} — a free live session with ${session.speaker}.`,
    "",
    "Join from the Google Meet link on this event.",
    communityUrl ? `Our WhatsApp community: ${communityUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const event = await sessionEvent(session, description);
  let meetLink = event?.meetLink ?? null;
  if (event && !meetLink) meetLink = await refreshSessionMeetLink(session.startsAt, event.eventId);

  if (event) {
    // Google emails the invitation as part of this. Re-run on a resubmit too:
    // it dedupes on the address, so someone who never got the first invitation
    // gets one now.
    const invited = await addSeminarGuest(event.eventId, { email, name });
    if (invited) await markSeminarInvited(email, session.startsAt);
  }

  // Serverless kills the process the moment the response returns, so these have
  // to finish first — but allSettled, because a failed send must not fail a
  // booking that already succeeded.
  await Promise.allSettled([
    sendSeminarConfirmationEmail({ name, email, title: session.title, when, meetLink, communityUrl }),
    communityUrl && created
      ? notifySeminarWhatsApp(phone, name, when, communityUrl, country)
      : Promise.resolve({ sent: false }),
    created
      ? notifyAdminWhatsApp(`New seminar registration: ${name} (${email}, ${phone}) for ${when}`)
      : Promise.resolve({ sent: false }),
  ]);

  return NextResponse.json({
    ok: true,
    alreadyRegistered: !created,
    when,
    title: session.title,
    speaker: session.speaker,
    meetLink,
    communityUrl,
  });
}
