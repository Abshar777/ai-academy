"use client";

/**
 * Fire-and-forget welcome email trigger, shared by every form that collects
 * contact details (enquiry modal, /order, in-chat enrol). Never awaited by
 * its callers — email delivery (or a missing SMTP config) must never block
 * or break form submission, same principle as the payment-link fallback.
 */
export function sendWelcomeEmailRequest(contact: {
  name: string;
  email: string;
  phone?: string;
  country?: string;
}) {
  fetch("/api/send-welcome-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  }).catch(() => {
    // Best-effort — the visitor's form submission already succeeded.
  });
}
