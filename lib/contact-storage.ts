/**
 * Shared local persistence for the one piece of data collected in three
 * different places on the site (the enquiry modal, /order, and the chat
 * widget's in-chat enrolment): name, email, phone. Whichever one the visitor
 * fills in first prefills the other two, rather than asking three times.
 *
 * localStorage, not a server — there's no backend for any of these forms yet
 * (see the NOTE comments at each submit handler), so this is purely a client-
 * side convenience, not a record of anything that's actually been sent
 * anywhere.
 */

export type ContactDetails = {
  name: string;
  email: string;
  phone: string;
};

const KEY = "delta-contact-details";

export function saveContactDetails(details: ContactDetails) {
  try {
    localStorage.setItem(KEY, JSON.stringify(details));
  } catch {
    // Private browsing / storage disabled — the form still works, it just
    // won't prefill anywhere else.
  }
}

export function loadContactDetails(): ContactDetails | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.name === "string" &&
      typeof parsed?.email === "string" &&
      typeof parsed?.phone === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
