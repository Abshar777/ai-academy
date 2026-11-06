import { readFile } from "node:fs/promises";
import { seminarIcs } from "./seminar-ics";
import path from "node:path";
import nodemailer from "nodemailer";
import { CURRICULUM, CURRICULUM_TOPIC_COUNT } from "./curriculum";
import { generateInvoicePdf } from "./invoice";
import { emailLayout } from "./email-templates";
import { PROGRAMME_NAME } from "./site";
import { logEmail, type EmailAttachmentRef } from "./email-log";

/**
 * Welcome email — fired once a visitor completes any contact form (the
 * enquiry modal, /order, or the in-chat enrol form; see saveContactDetails
 * call sites), not gated on payment. Carries the same brochure PDF the
 * "Get the brochure" buttons link to, plus the full curriculum inline so the
 * visitor has it even if they never come back to the site.
 */

const BROCHURE_PATH = path.join(process.cwd(), "public", "DELTA AI ACADEMY BROCHURE.pdf");

let transporter: nodemailer.Transporter | null = null;

/** Returns null (rather than throwing) when SMTP isn't configured yet — the
 *  contact forms this powers must keep working, with or without email, the
 *  same way /order keeps working without a live payment link. */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Pooled for the same reason as the seminar mailbox below: one login per
    // message is what gets a Gmail account throttled.
    pool: true,
    maxConnections: 2,
    maxMessages: 200,
    rateDelta: 1000,
    rateLimit: 4,
  });
  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function courseDetailsHtml(): string {
  return CURRICULUM.map(
    (mod, i) => `
      <h3 style="margin:20px 0 4px;font-size:16px;">Module ${i + 1}: ${escapeHtml(mod.title)}</h3>
      <p style="margin:0 0 8px;color:#555;">${escapeHtml(mod.blurb)}</p>
      <ul style="margin:0;padding-left:20px;color:#333;">
        ${mod.topics.map((t) => `<li>${escapeHtml(t.label)}</li>`).join("")}
      </ul>
    `,
  ).join("");
}

function welcomeEmailHtml(name: string): string {
  const greeting = name ? escapeHtml(name) : "there";
  return emailLayout({
    preheader: `Your Delta AI Academy curriculum and brochure are here, ${greeting}.`,
    bodyHtml: `
      <h2 style="margin:0 0 4px;font-size:22px;letter-spacing:-0.01em;">Welcome, ${greeting}!</h2>
      <p style="margin:0 0 20px;color:#444;">Thanks for your interest in the programme. Here's the full curriculum —
      ${CURRICULUM.length} modules, ${CURRICULUM_TOPIC_COUNT} topics — plus the brochure attached to this email.</p>
      ${courseDetailsHtml()}
      <p style="margin-top:24px;color:#555;">Questions in the meantime? Just reply to this email
      and the team will get back to you.</p>
    `,
  });
}

/**
 * The free seminar sends from its own mailbox rather than the site's no-reply
 * address, so it matches the sender on the Google Calendar invite — that goes
 * out as the Workspace user who owns the calendar, and two different senders
 * for one registration reads as a phishing attempt rather than a confirmation.
 *
 * Falls back to the main transport when it isn't configured, which is better
 * than sending nothing. SMTP_BACKUP_* is accepted as an alias because that is
 * what the same mailbox is called on the course API.
 */
let seminarTransporter: nodemailer.Transporter | null = null;

function getSeminarTransporter(): { transport: nodemailer.Transporter; from: string } | null {
  const env = process.env;
  const host = env.SMTP_SEMINAR_HOST || env.SMTP_BACKUP_HOST;
  const user = env.SMTP_SEMINAR_USER || env.SMTP_BACKUP_USER;
  const pass = env.SMTP_SEMINAR_PASS || env.SMTP_BACKUP_PASS;

  if (!host || !user || !pass) {
    const fallback = getTransporter();
    if (!fallback) return null;
    return { transport: fallback, from: env.SMTP_FROM || env.SMTP_USER || "" };
  }

  const port = Number(env.SMTP_SEMINAR_PORT || env.SMTP_BACKUP_PORT) || 587;
  if (!seminarTransporter) {
    seminarTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // A pooled connection reused across a batch, not a fresh login per
      // message. Gmail throttles a burst of logins long before it throttles
      // messages, and a reminder to sixty-five people sent eight at a time was
      // exactly that burst: two batches went through, then every send failed
      // for the rest of the evening's session. Two connections, a few messages
      // a second, and the whole list goes out on a handful of logins.
      pool: true,
      maxConnections: 2,
      maxMessages: 200,
      rateDelta: 1000,
      rateLimit: 4,
    });
  }
  const from =
    env.SMTP_SEMINAR_FROM || env.SMTP_BACKUP_FROM || env.SMTP_BACKUP_EMAIL_FROM || user;
  return { transport: seminarTransporter, from };
}

function seminarEmailHtml(input: {
  name: string;
  title: string;
  when: string;
  meetLink: string | null;
  communityUrl: string | null;
  hasIcs?: boolean;
}): string {
  const greeting = input.name ? escapeHtml(input.name) : "there";
  const button = (href: string, label: string, background: string, color: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:12px 22px;border-radius:8px;background:${background};color:${color};font-weight:600;text-decoration:none;">${label}</a>`;

  return emailLayout({
    preheader: `Your seat is booked — ${input.when}.`,
    bodyHtml: `
      <h2 style="margin:0 0 4px;font-size:22px;letter-spacing:-0.01em;">You're in, ${greeting}!</h2>
      <p style="margin:0 0 20px;color:#444;">Your seat at <strong>${escapeHtml(input.title)}</strong> is booked.</p>

      <table role="presentation" style="margin:0 0 20px;border-collapse:collapse;">
        <tr><td style="padding:4px 16px 4px 0;color:#777;">When</td><td style="padding:4px 0;color:#111;font-weight:600;">${escapeHtml(input.when)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#777;">Where</td><td style="padding:4px 0;color:#111;font-weight:600;">Google Meet — link below</td></tr>
      </table>

      <p style="margin:0 0 16px;color:#444;">A Google Calendar invitation is on its way to this address — accept it and
      the session sits in your calendar with the joining link, and Google will remind you before it starts.${
        input.hasIcs
          ? ` If it doesn't appear, open the <strong>calendar file attached to this email</strong> instead — it adds the
      same session to Google Calendar, Apple Calendar or Outlook in one tap.`
          : ""
      }</p>

      ${input.meetLink ? button(input.meetLink, "Join the seminar", "#14151c", "#ffffff") : ""}
      ${input.communityUrl ? button(input.communityUrl, "Join the WhatsApp community", "#25D366", "#ffffff") : ""}

      <p style="margin:20px 0 0;color:#555;">See you there. Just reply to this email if anything comes up.</p>
    `,
  });
}

export async function sendSeminarConfirmationEmail(input: {
  name: string;
  email: string;
  title: string;
  when: string;
  meetLink: string | null;
  communityUrl: string | null;
  /** Everything the attached calendar file needs. Optional so the email still
   *  sends when the calendar integration is unconfigured. */
  calendar?: {
    eventId: string | null;
    description: string;
    startsAt: string;
    durationMinutes: number;
  };
}): Promise<{ sent: boolean }> {
  const subject = `You're registered — ${input.title}, ${input.when}`;
  const mailer = getSeminarTransporter();
  if (!mailer) {
    console.info("[seminar] SMTP not configured — skipping confirmation to", input.email);
    await logEmail({
      kind: "seminar-confirmation",
      to: input.email,
      subject,
      status: "skipped",
      error: "SMTP not configured",
    });
    return { sent: false };
  }

  // One click, and it does not depend on the recipient ever having heard from
  // us — unlike the Google invitation, which their own settings may hold back.
  const ics = input.calendar
    ? seminarIcs({
        eventId: input.calendar.eventId,
        title: input.title,
        description: input.calendar.description,
        location: input.meetLink,
        startsAt: input.calendar.startsAt,
        durationMinutes: input.calendar.durationMinutes,
        organizerName: "Delta AI Academy",
        organizerEmail: mailer.from,
      })
    : null;

  const attachments: nodemailer.SendMailOptions["attachments"] = ics
    ? [
        {
          filename: "delta-ai-academy-seminar.ics",
          content: ics,
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ]
    : [];

  const html = seminarEmailHtml({ ...input, hasIcs: attachments.length > 0 });
  // Kept verbatim rather than as a recipe: the event it describes is gone from
  // this process the moment the request ends, so a resend could not rebuild it.
  const logged: EmailAttachmentRef[] = ics
    ? [{ kind: "ics", filename: "delta-ai-academy-seminar.ics", content: ics }]
    : [];

  try {
    await mailer.transport.sendMail({
      from: mailer.from,
      to: input.email,
      subject,
      html,
      attachments,
    });
    await logEmail({
      kind: "seminar-confirmation",
      to: input.email,
      subject,
      status: "sent",
      mailbox: mailer.from,
      bodyHtml: html,
      attachments: logged,
    });
    return { sent: true };
  } catch (err) {
    console.error("[seminar] confirmation email failed for", input.email, err);
    await logEmail({
      kind: "seminar-confirmation",
      to: input.email,
      subject,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      mailbox: mailer.from,
      bodyHtml: html,
      attachments: logged,
    });
    return { sent: false };
  }
}

/**
 * Reminder before a seminar: 30, 15, 10, 5 or 3 minutes ahead, or as it starts.
 *
 * Short on purpose. Someone reading this has minutes, or none: one line saying
 * how long, one button into the room, and the link written out beneath it for
 * the client that strips the button. Sent from the seminar mailbox so it lands
 * in the same thread of sender as the confirmation and the calendar invite.
 */
const REMINDER_COPY: Record<number, { subject: string; heading: string; line: string }> = {
  30: { subject: "Starting in 30 minutes", heading: "Starting in 30 minutes", line: "Your seat is ready. Grab a coffee, open the link a couple of minutes early, and we'll see you there." },
  15: { subject: "15 minutes to go", heading: "15 minutes to go", line: "The room opens shortly. Tap the button below when you're ready — it takes you straight in." },
  10: { subject: "Starting in 10 minutes", heading: "Starting in 10 minutes", line: "The room is open. Join now, get your audio sorted, and we'll begin shortly." },
  5: { subject: "Starting in 5 minutes", heading: "Starting in 5 minutes", line: "We're about to begin. Join now so you're in the room when it starts." },
  3: { subject: "3 minutes — join now", heading: "3 minutes", line: "We're going live in three minutes. Tap the button and come on in." },
  0: { subject: "We're live — join now", heading: "We're live", line: "The session has started. Join now — you haven't missed anything yet." },
};

export function seminarReminderEmailHtml(input: {
  name: string;
  title: string;
  speaker: string;
  when: string;
  minutesBefore: number;
  meetLink: string;
}): string {
  const copy = REMINDER_COPY[input.minutesBefore] ?? REMINDER_COPY[0];
  const greeting = input.name ? escapeHtml(input.name.split(" ")[0]) : "there";
  const link = escapeHtml(input.meetLink);
  return emailLayout({
    preheader: `${copy.subject} — ${input.title}. Your joining link is inside.`,
    bodyHtml: `
      <p style="margin:0 0 6px;color:#777;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Free live seminar</p>
      <h2 style="margin:0 0 12px;font-size:26px;line-height:1.15;letter-spacing:-0.02em;">${escapeHtml(copy.heading)}, ${greeting}</h2>
      <p style="margin:0 0 20px;color:#444;"><strong>${escapeHtml(input.title)}</strong> with ${escapeHtml(input.speaker)} &mdash; ${escapeHtml(input.when)}.</p>
      <p style="margin:0 0 24px;color:#444;">${escapeHtml(copy.line)}</p>

      <a href="${link}" style="display:inline-block;padding:16px 28px;border-radius:10px;background:#14151c;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">Join on Google Meet &rarr;</a>

      <p style="margin:20px 0 0;color:#777;font-size:13px;line-height:1.6;">If the button doesn't open, copy this link into your browser:<br />
      <a href="${link}" style="color:#14151c;word-break:break-all;">${link}</a></p>

      <p style="margin:20px 0 0;color:#555;">Can't get in? Reply to this email and we'll help.</p>
    `,
  });
}

export async function sendSeminarReminderEmail(input: {
  name: string;
  email: string;
  title: string;
  speaker: string;
  when: string;
  minutesBefore: number;
  meetLink: string;
}): Promise<{ sent: boolean; error?: string }> {
  const copy = REMINDER_COPY[input.minutesBefore] ?? REMINDER_COPY[0];
  const subject = `${copy.subject} — ${input.title}`;
  const mailer = getSeminarTransporter();
  if (!mailer) {
    await logEmail({
      kind: "seminar-reminder",
      to: input.email,
      subject,
      status: "skipped",
      error: "SMTP not configured",
    });
    return { sent: false, error: "SMTP not configured" };
  }
  const html = seminarReminderEmailHtml(input);
  try {
    await mailer.transport.sendMail({
      from: mailer.from,
      to: input.email,
      subject,
      html,
    });
    await logEmail({
      kind: "seminar-reminder",
      to: input.email,
      subject,
      status: "sent",
      mailbox: mailer.from,
      bodyHtml: html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[seminar] reminder email failed for", input.email, err);
    const message = err instanceof Error ? err.message : String(err);
    await logEmail({
      kind: "seminar-reminder",
      to: input.email,
      subject,
      status: "failed",
      error: message,
      mailbox: mailer.from,
      bodyHtml: html,
    });
    return { sent: false, error: message };
  }
}

/**
 * Hands a registered student their free access to the course.
 *
 * The code is in the link and also printed in the body: the link does the work
 * — /order applies it on arrival — but a link that gets mangled by a mail
 * client, or opened on a different device, leaves them with something they can
 * type in by hand.
 *
 * One code per student, single use. Shared codes cannot be withdrawn from one
 * person without withdrawing them from everybody.
 */
export function courseAccessEmailHtml(input: {
  name: string;
  code: string;
  url: string;
  lessons: number;
  duration: string;
}): string {
  const greeting = input.name ? escapeHtml(input.name.split(" ")[0]) : "there";
  return emailLayout({
    preheader: `Your free access code for ${PROGRAMME_NAME}.`,
    bodyHtml: `
      <h2 style="margin:0 0 4px;font-size:22px;letter-spacing:-0.01em;">Your free access, ${greeting}</h2>
      <p style="margin:0 0 20px;color:#444;">You registered for our AI video class, so here is your
      access to <strong>${escapeHtml(PROGRAMME_NAME)}</strong> — ${input.lessons} lessons,
      ${escapeHtml(input.duration)}, yours to keep.</p>

      <p style="margin:0 0 8px;color:#777;font-size:14px;">Your personal code</p>
      <p style="margin:0 0 20px;font-size:26px;font-weight:700;letter-spacing:0.08em;color:#111;">${escapeHtml(input.code)}</p>

      <a href="${escapeHtml(input.url)}" style="display:inline-block;margin:0 0 20px;padding:14px 26px;border-radius:8px;background:#14151c;color:#ffffff;font-weight:600;text-decoration:none;">Claim your free access</a>

      <p style="margin:0 0 16px;color:#444;">The code is already applied when you open that link — fill in
      your details and the course opens. No card, nothing to pay.</p>

      <p style="margin:0;color:#777;font-size:13px;">This code works once and is yours alone. If the button
      doesn't work, go to ${escapeHtml(input.url)}</p>
    `,
  });
}

export async function sendCourseAccessEmail(input: {
  name: string;
  email: string;
  code: string;
  url: string;
  lessons: number;
  duration: string;
}): Promise<{ sent: boolean; error?: string }> {
  const subject = `Your free access to ${PROGRAMME_NAME}`;
  const transport = getTransporter();
  if (!transport) {
    await logEmail({
      kind: "course-access",
      to: input.email,
      subject,
      status: "skipped",
      error: "SMTP not configured",
    });
    return { sent: false, error: "SMTP not configured" };
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const html = courseAccessEmailHtml(input);
  try {
    await transport.sendMail({ from, to: input.email, subject, html });
    await logEmail({
      kind: "course-access",
      to: input.email,
      subject,
      status: "sent",
      mailbox: from,
      bodyHtml: html,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmail({
      kind: "course-access",
      to: input.email,
      subject,
      status: "failed",
      error: message,
      mailbox: from,
      bodyHtml: html,
    });
    return { sent: false, error: message };
  }
}

export type SendWelcomeEmailResult = { sent: boolean };

export async function sendWelcomeEmail({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<SendWelcomeEmailResult> {
  const subject = "Welcome to Delta AI Academy — your brochure and course details";
  const transport = getTransporter();
  if (!transport) {
    console.info("SMTP not configured — skipping welcome email to", email);
    await logEmail({ kind: "welcome", to: email, subject, status: "skipped", error: "SMTP not configured" });
    return { sent: false };
  }

  let attachments: nodemailer.SendMailOptions["attachments"] = [];
  let logged: EmailAttachmentRef[] = [];
  try {
    attachments = [
      { filename: "Delta AI Academy Brochure.pdf", content: await readFile(BROCHURE_PATH) },
    ];
    logged = [{ kind: "brochure", filename: "Delta AI Academy Brochure.pdf" }];
  } catch (err) {
    // Missing/unreadable brochure shouldn't block the rest of the welcome
    // email from sending.
    console.error("Could not read brochure PDF for welcome email", err);
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const html = welcomeEmailHtml(name);

  // Logged either way, then rethrown: the caller (app/api/send-welcome-email)
  // turns a throw into a 502, and swallowing it here to make logging tidier
  // would quietly report a failed send as a success.
  try {
    await transport.sendMail({ from, to: email, subject, html, attachments });
  } catch (err) {
    await logEmail({
      kind: "welcome",
      to: email,
      subject,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      mailbox: from,
      bodyHtml: html,
      attachments: logged,
    });
    throw err;
  }

  await logEmail({
    kind: "welcome",
    to: email,
    subject,
    status: "sent",
    mailbox: from,
    bodyHtml: html,
    attachments: logged,
  });

  return { sent: true };
}

/**
 * Invoice/receipt email — fired once from app/api/razorpay/verify/route.ts,
 * only after a payment signature has actually verified. name/email/amount
 * there come from the order's own notes/fields (set server-side at order
 * creation), never from the client request, so this only ever fires for a
 * real paid order.
 */
export async function sendInvoiceEmail({
  name,
  email,
  amountMinorUnits,
  currency,
  paymentId,
  orderId,
}: {
  name: string;
  email: string;
  amountMinorUnits: number;
  currency: string;
  paymentId: string;
  orderId: string;
}): Promise<SendWelcomeEmailResult> {
  const amount = (amountMinorUnits / 100).toFixed(2);
  const subject = `Your Delta AI Academy invoice — ${currency} ${amount}`;
  const transport = getTransporter();
  if (!transport) {
    console.info("SMTP not configured — skipping invoice email to", email);
    await logEmail({
      kind: "invoice",
      to: email,
      subject,
      status: "skipped",
      error: "SMTP not configured",
      orderId,
      paymentId,
    });
    return { sent: false };
  }

  const date = new Date();
  const pdf = await generateInvoicePdf({
    name,
    email,
    amountMinorUnits,
    currency,
    paymentId,
    orderId,
    date,
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const filename = `Delta AI Academy Invoice ${orderId}.pdf`;
  // The figures rather than the file: the same PDF comes back out of them.
  const logged: EmailAttachmentRef[] = [
    {
      kind: "invoice",
      filename,
      invoice: {
        name,
        email,
        amountMinorUnits,
        currency,
        paymentId,
        orderId,
        date: date.toISOString(),
      },
    },
  ];
  const html = emailLayout({
      preheader: `Payment confirmed — ${currency} ${amount}. Your invoice is attached.`,
      bodyHtml: `
        <h2 style="margin:0 0 4px;font-size:22px;letter-spacing:-0.01em;">Payment received, thank you${name ? `, ${escapeHtml(name)}` : ""}!</h2>
        <p style="margin:0 0 20px;color:#444;">Your payment for Delta AI Academy has been received and confirmed.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#f7f7f5;border-radius:12px;margin:0 0 20px;">
          <tr>
            <td style="padding:16px 20px;font-size:14px;color:#171717;">
              <strong>Amount:</strong> ${currency} ${amount}<br/>
              <strong>Payment ID:</strong> ${escapeHtml(paymentId)}
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#555;">Your invoice is attached to this email. Welcome to the programme — the team will
        be in touch with next steps.</p>
      `,
  });

  // Logged on both paths, then rethrown — the verify and webhook routes each
  // catch this themselves, and swallowing it here would file a payment whose
  // receipt never arrived as one that did.
  try {
    await transport.sendMail({
      from,
      to: email,
      subject,
      html,
      attachments: [{ filename, content: pdf }],
    });
  } catch (err) {
    await logEmail({
      kind: "invoice",
      to: email,
      subject,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      mailbox: from,
      bodyHtml: html,
      attachments: logged,
      orderId,
      paymentId,
    });
    throw err;
  }

  await logEmail({
    kind: "invoice",
    to: email,
    subject,
    status: "sent",
    mailbox: from,
    bodyHtml: html,
    attachments: logged,
    orderId,
    paymentId,
  });

  return { sent: true };
}
