/**
 * The email vocabulary, with nothing behind it.
 *
 * Separate from lib/email-log.ts on purpose. That module imports the MongoDB
 * driver, and a client component importing a *runtime* value from it — a
 * label map is a runtime value, unlike a type, which is erased — pulls the
 * whole driver into the browser bundle. Typecheck and lint both pass straight
 * through that; only loading the page finds it. This file has no imports at
 * all, so the admin table can read the labels without dragging a database
 * client to the browser with them.
 */

export type EmailKind =
  | "welcome"
  | "invoice"
  | "course-access"
  | "seminar-confirmation"
  | "seminar-reminder"
  | "sign-in-code"
  | "login-link"
  | "device-approval";

export const EMAIL_KIND_LABEL: Record<EmailKind, string> = {
  welcome: "Welcome + brochure",
  invoice: "Invoice / receipt",
  "course-access": "Free course access",
  "seminar-confirmation": "Seminar confirmation",
  "seminar-reminder": "Seminar reminder",
  "sign-in-code": "Sign-in code",
  "login-link": "Sign-in link",
  "device-approval": "Device approval notice",
};

/**
 * "skipped" is its own outcome rather than a failure: SMTP being unconfigured
 * is how this project runs in development, and filing that as an error would
 * bury the real ones.
 */
export type EmailStatus = "sent" | "failed" | "skipped";

/**
 * A one-time secret is worth nothing the second time: a sign-in code has
 * expired and a login link is spent, so resending either delivers something
 * that cannot work while looking to the recipient like it should. Those two
 * are issued fresh by the sign-in flow instead.
 */
const NOT_RESENDABLE: ReadonlySet<EmailKind> = new Set<EmailKind>(["sign-in-code", "login-link"]);

export function canResend(kind: EmailKind): boolean {
  return !NOT_RESENDABLE.has(kind);
}
