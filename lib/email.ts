import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { CURRICULUM, CURRICULUM_TOPIC_COUNT } from "./curriculum";
import { generateInvoicePdf } from "./invoice";
import { emailLayout } from "./email-templates";

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

      <p style="margin:0 0 16px;color:#444;">A Google Calendar invitation is on its way to this address.
      Accept it and the session — with the joining link — sits in your calendar, and Google will remind you before it starts.</p>

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
}): Promise<{ sent: boolean }> {
  const mailer = getSeminarTransporter();
  if (!mailer) {
    console.info("[seminar] SMTP not configured — skipping confirmation to", input.email);
    return { sent: false };
  }
  try {
    await mailer.transport.sendMail({
      from: mailer.from,
      to: input.email,
      subject: `You're registered — ${input.title}, ${input.when}`,
      html: seminarEmailHtml(input),
    });
    return { sent: true };
  } catch (err) {
    console.error("[seminar] confirmation email failed for", input.email, err);
    return { sent: false };
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
  const transport = getTransporter();
  if (!transport) {
    console.info("SMTP not configured — skipping welcome email to", email);
    return { sent: false };
  }

  let attachments: nodemailer.SendMailOptions["attachments"] = [];
  try {
    attachments = [
      { filename: "Delta AI Academy Brochure.pdf", content: await readFile(BROCHURE_PATH) },
    ];
  } catch (err) {
    // Missing/unreadable brochure shouldn't block the rest of the welcome
    // email from sending.
    console.error("Could not read brochure PDF for welcome email", err);
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Welcome to Delta AI Academy — your brochure and course details",
    html: welcomeEmailHtml(name),
    attachments,
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
  const transport = getTransporter();
  if (!transport) {
    console.info("SMTP not configured — skipping invoice email to", email);
    return { sent: false };
  }

  const date = new Date();
  const amount = (amountMinorUnits / 100).toFixed(2);
  const pdf = await generateInvoicePdf({
    name,
    email,
    amountMinorUnits,
    currency,
    paymentId,
    orderId,
    date,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Your Delta AI Academy invoice — ${currency} ${amount}`,
    html: emailLayout({
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
    }),
    attachments: [{ filename: `Delta AI Academy Invoice ${orderId}.pdf`, content: pdf }],
  });

  return { sent: true };
}
