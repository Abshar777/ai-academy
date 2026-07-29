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

export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 7;
}
