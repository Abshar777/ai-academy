import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { isValidEmail } from "@/lib/contact-validation";
import { seminarReminderEmailHtml } from "@/lib/email";
import { formatWebinarDate, formatWebinarTime } from "@/lib/next-webinar";
import {
  REMINDER_STAGES,
  SEMINAR_MEET_URL,
  sessionForAdmin,
  reminderStatus,
  sendReminderNow,
  type ReminderStage,
} from "@/lib/seminar-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the admin's reminder panel shows: the next session, what has gone out
 * for it, and what is still to come. With `?preview=<stage>`, the email itself
 * as HTML, exactly as a registrant would receive it — for reading before it is
 * sent to anyone.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const preview = new URL(request.url).searchParams.get("preview");
  if (preview !== null) {
    const stage = Number(preview);
    if (!REMINDER_STAGES.includes(stage as ReminderStage)) {
      return NextResponse.json({ error: `preview must be one of ${REMINDER_STAGES.join(", ")}.` }, { status: 400 });
    }
    const session = sessionForAdmin();
    if (!session) return NextResponse.json({ error: "No session running or upcoming." }, { status: 404 });
    const date = new Date(session.startsAt);
    const html = seminarReminderEmailHtml({
      name: "Priya",
      title: session.title,
      speaker: session.speaker,
      when: `${formatWebinarDate(date)} · ${formatWebinarTime(date)}`,
      minutesBefore: stage,
      meetLink: SEMINAR_MEET_URL,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return NextResponse.json(await reminderStatus());
}

/**
 * The admin's button. `{ stage }` sends that reminder to every registrant of
 * the next session now; `{ stage, testTo }` sends it to one address instead,
 * so it can be read before sixty people receive it.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { stage?: unknown; testTo?: unknown } | null;
  const stage = Number(body?.stage);
  if (!REMINDER_STAGES.includes(stage as ReminderStage)) {
    return NextResponse.json({ error: `stage must be one of ${REMINDER_STAGES.join(", ")}.` }, { status: 400 });
  }

  let testTo: string | undefined;
  if (body?.testTo !== undefined && body.testTo !== "") {
    if (typeof body.testTo !== "string" || !isValidEmail(body.testTo)) {
      return NextResponse.json({ error: "testTo must be an email address." }, { status: 400 });
    }
    testTo = body.testTo;
  }

  const result = await sendReminderNow(stage as ReminderStage, { testTo });
  return NextResponse.json(result, { status: result.ok ? 200 : result.error ? 409 : 207 });
}
