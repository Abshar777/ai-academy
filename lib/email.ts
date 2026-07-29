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
