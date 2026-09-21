/** Shared server-side validation for the contact fields collected by every
 *  form on the site — mirrors the client-side checks in order-form.tsx,
 *  chat-enroll-form.tsx and contact-dialog.tsx, but re-run here because the
 *  API routes must never trust client-side validation alone. */

export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Checkout does not ask for a phone number — one more field between someone
 * and paying, for something we can ask for once they have. Blank passes; a
 * number that was actually typed still has to look like one, so a slip is
 * caught rather than quietly stored.
 */
export function isValidOptionalPhone(phone: string): boolean {
  return phone.trim() === "" || isValidPhone(phone);
}

export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 7;
}
