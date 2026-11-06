import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { canResend, getEmailLogEntry, logEmail, type EmailAttachmentRef } from "@/lib/email-log";
import { generateInvoicePdf } from "@/lib/invoice";

export const runtime = "nodejs";

/**
 * Sends a logged email again, exactly as it went the first time.
 *
 * The stored body is what the recipient would have seen, so there is nothing
 * to re-render and no risk of a template change making the second copy differ
 * from the one being asked about. Attachments are rebuilt from the recipe in
 * the row — see EmailAttachmentRef.
 *
 * The original row is never touched. A resend writes its own row pointing
 * back at it, so the log still says what happened the first time: a record
 * that rewrites itself to look successful is not a record.
 */

const BROCHURE_PATH = path.join(process.cwd(), "public", "DELTA AI ACADEMY BROCHURE.pdf");

async function buildAttachments(
  refs: EmailAttachmentRef[] | undefined,
): Promise<nodemailer.SendMailOptions["attachments"]> {
  if (!refs?.length) return [];
  const built: NonNullable<nodemailer.SendMailOptions["attachments"]> = [];
  for (const ref of refs) {
    if (ref.kind === "brochure") {
      try {
        built.push({ filename: ref.filename, content: await readFile(BROCHURE_PATH) });
      } catch (err) {
        // Same call as the original send makes: a missing brochure must not
        // hold back the email it was attached to.
        console.error("[resend] brochure unreadable", err);
      }
    } else if (ref.kind === "invoice") {
      built.push({
        filename: ref.filename,
        content: await generateInvoicePdf({
          ...ref.invoice,
          date: new Date(ref.invoice.date),
        }),
      });
    } else {
      built.push({
        filename: ref.filename,
        content: ref.content,
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      });
    }
  }
  return built;
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let id = "";
  let to = "";
  try {
    const body = (await request.json()) as { id?: unknown; to?: unknown };
    id = typeof body.id === "string" ? body.id : "";
    // An override, for the common case: the address was wrong the first time.
    to = typeof body.to === "string" ? body.to.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const entry = await getEmailLogEntry(id);
  if (!entry) return NextResponse.json({ error: "Email not found." }, { status: 404 });

  if (!canResend(entry.kind)) {
    return NextResponse.json(
      {
        error:
          "This one can't be resent — a sign-in code expires and a sign-in link is spent, so the old one wouldn't work. Ask them to sign in again and a fresh one goes out.",
      },
      { status: 409 },
    );
  }

  if (!entry.bodyHtml) {
    return NextResponse.json(
      { error: "This email was logged before its body was kept, so there's nothing to send again." },
      { status: 409 },
    );
  }

  const recipient = to || entry.to;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({ error: "SMTP isn't configured on this server." }, { status: 503 });
  }

  const port = Number(SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const from = process.env.SMTP_FROM || SMTP_USER;
  const subject = entry.subject;

  try {
    await transport.sendMail({
      from,
      to: recipient,
      subject,
      html: entry.bodyHtml,
      attachments: await buildAttachments(entry.attachments),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmail({
      kind: entry.kind,
      to: recipient,
      subject,
      status: "failed",
      error: message,
      mailbox: from,
      bodyHtml: entry.bodyHtml,
      attachments: entry.attachments,
      enrollmentId: entry.enrollmentId,
      orderId: entry.orderId,
      paymentId: entry.paymentId,
      resentFrom: entry._id,
    });
    return NextResponse.json({ error: `Could not send: ${message}` }, { status: 502 });
  }

  await logEmail({
    kind: entry.kind,
    to: recipient,
    subject,
    status: "sent",
    mailbox: from,
    bodyHtml: entry.bodyHtml,
    attachments: entry.attachments,
    enrollmentId: entry.enrollmentId,
    orderId: entry.orderId,
    paymentId: entry.paymentId,
    resentFrom: entry._id,
  });

  return NextResponse.json({ sent: true, to: recipient });
}
