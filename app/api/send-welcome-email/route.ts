import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/contact-validation";
import { notifyAdminWhatsApp, notifyWelcomeWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; phone?: unknown; country?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : undefined;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  let result: { sent: boolean };
  try {
    result = await sendWelcomeEmail({ name, email });
  } catch (err) {
    console.error("Failed to send welcome email", err);
    return NextResponse.json({ error: "Could not send welcome email." }, { status: 502 });
  }

  // WhatsApp is a best-effort side channel here, same as the email above is
  // for the caller's own form submission — a WhatsApp failure must never
  // turn an otherwise-successful enquiry into an error response. Awaited
  // (rather than fired-and-forgotten) so the sends actually complete before
  // this serverless function's response ends the invocation.
  await Promise.allSettled([
    phone ? notifyWelcomeWhatsApp(phone, name, country) : Promise.resolve(),
    notifyAdminWhatsApp(`New enquiry: ${name || "Unknown"} (${email}${phone ? `, ${phone}` : ""})`),
  ]);

  return NextResponse.json(result);
}
