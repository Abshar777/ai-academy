/**
 * Google Calendar for the free seminar — one event per session, each
 * registrant added to it as a guest so Google sends them its own invitation
 * and reminders, and the Meet link lands in their calendar rather than only in
 * an email they have to keep.
 *
 * Auth is a service account using domain-wide delegation to act as the
 * Workspace user who owns the calendar (GOOGLE_CALENDAR_IMPERSONATE). That
 * detail is not optional: a service account acting as itself can create events
 * on a calendar shared with it, but Google refuses to let it invite anyone —
 * `403 forbiddenForServiceAccounts`. Acting as the owner is what makes guests
 * possible at all.
 *
 * Scope is calendar.events, not the full calendar scope. That is all the
 * delegation grants and all this needs; asking for more fails the token
 * exchange outright.
 *
 * Missing configuration means "skip", never "throw" — the same rule lib/email.ts
 * and lib/whatsapp.ts follow. Someone registering for a seminar must not be
 * turned away because a calendar credential expired.
 */

import { createSign } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_SKEW_MS = 60_000;

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

type Config = {
  key: ServiceAccountKey;
  calendarId: string;
  impersonate: string;
};

export type SeminarEvent = {
  eventId: string;
  /** The Google Meet URL Calendar generated for this event. */
  meetLink: string | null;
};

function config(): Config | null {
  const { GOOGLE_CALENDAR_KEY, GOOGLE_CALENDAR_ID, GOOGLE_CALENDAR_IMPERSONATE } = process.env;
  if (!GOOGLE_CALENDAR_KEY || !GOOGLE_CALENDAR_ID || !GOOGLE_CALENDAR_IMPERSONATE) return null;

  let key: ServiceAccountKey;
  try {
    // Base64 so the whole JSON — newlines in the private key included —
    // survives being a single env var on every host we deploy to.
    key = JSON.parse(Buffer.from(GOOGLE_CALENDAR_KEY, "base64").toString("utf8"));
  } catch {
    console.error("[cal] GOOGLE_CALENDAR_KEY is not base64-encoded service-account JSON");
    return null;
  }
  if (!key.client_email || !key.private_key) {
    console.error("[cal] GOOGLE_CALENDAR_KEY is missing client_email or private_key");
    return null;
  }
  return {
    key: { ...key, token_uri: key.token_uri || "https://oauth2.googleapis.com/token" },
    calendarId: GOOGLE_CALENDAR_ID,
    impersonate: GOOGLE_CALENDAR_IMPERSONATE,
  };
}

export function isCalendarConfigured(): boolean {
  return config() !== null;
}

const b64url = (value: string | object): string =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

/** Access tokens last an hour; minting one per registration would be a wasted
 *  round trip on every form submission. */
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(conf: Config): Promise<string | null> {
  if (cached && cached.expiresAt - TOKEN_SKEW_MS > Date.now()) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: conf.key.client_email,
    sub: conf.impersonate,
    scope: SCOPE,
    aud: conf.key.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url(claims)}`;

  let assertion: string;
  try {
    assertion = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(conf.key.private_key, "base64url")}`;
  } catch (err) {
    console.error("[cal] could not sign the token request — is the private key intact?", err);
    return null;
  }

  let res: Response;
  try {
    res = await fetch(conf.key.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
  } catch (err) {
    console.error("[cal] token request failed — network", err);
    return null;
  }

  const body = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null;

  if (!res.ok || !body?.access_token) {
    // `unauthorized_client` here almost always means the domain-wide
    // delegation in the Workspace admin console doesn't cover this scope.
    console.error(`[cal] token refused — ${body?.error ?? res.status}: ${body?.error_description ?? ""}`);
    return null;
  }

  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function api<T>(conf: Config, path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const token = await accessToken(conf);
  if (!token) return { ok: false, status: 0, message: "no access token" };

  let res: Response;
  try {
    res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch (err) {
    console.error("[cal] request failed — network", err);
    return { ok: false, status: 0, message: "network" };
  }

  const text = await res.text().catch(() => "");
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON, reported below */ }

  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message ?? text.slice(0, 200);
    console.error(`[cal] ${init.method ?? "GET"} ${path} — HTTP ${res.status}: ${message}`);
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: body as T };
}

type GoogleEvent = {
  id: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { uri?: string }[] };
  attendees?: { email: string }[];
};

const meetLinkOf = (event: GoogleEvent): string | null =>
  event.hangoutLink ?? event.conferenceData?.entryPoints?.[0]?.uri ?? null;

/**
 * Creates the session's event, with Google Meet attached.
 *
 * Guests are barred from seeing each other and from inviting anyone: a public
 * seminar puts every registrant's email address on one event, and the default
 * would show that list to all of them.
 */
export async function createSeminarEvent(input: {
  title: string;
  description: string;
  location?: string | null;
  startsAt: string;
  durationMinutes: number;
  timeZone: string;
}): Promise<SeminarEvent | null> {
  const conf = config();
  if (!conf) return null;

  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  const result = await api<GoogleEvent>(
    conf,
    `/calendars/${encodeURIComponent(conf.calendarId)}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        ...(input.location ? { location: input.location } : {}),
        start: { dateTime: start.toISOString(), timeZone: input.timeZone },
        end: { dateTime: end.toISOString(), timeZone: input.timeZone },
        guestsCanSeeOtherGuests: false,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        conferenceData: {
          createRequest: {
            requestId: `seminar-${start.getTime()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  if (!result.ok) return null;
  return { eventId: result.data.id, meetLink: meetLinkOf(result.data) };
}

/**
 * Rewrites the wording on an event that already exists.
 *
 * Needed because the event is created on the first registration and then long
 * outlives it: correcting a title or adding the community link afterwards has
 * to reach the invitation everyone already has, not just the next one.
 *
 * sendUpdates is "none" — a reworded description is not worth mailing every
 * guest about, and Google would otherwise notify all of them on each edit.
 */
export async function updateSeminarEvent(
  eventId: string,
  content: { title: string; description: string; location?: string | null },
): Promise<boolean> {
  const conf = config();
  if (!conf) return false;
  const result = await api<GoogleEvent>(
    conf,
    `/calendars/${encodeURIComponent(conf.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      body: JSON.stringify({
        summary: content.title,
        description: content.description,
        ...(content.location ? { location: content.location } : {}),
      }),
    },
  );
  return result.ok;
}

/** Reads an event back, to confirm one we recorded earlier is still there. */
export async function getSeminarEvent(eventId: string): Promise<SeminarEvent | null> {
  const conf = config();
  if (!conf) return null;
  const result = await api<GoogleEvent>(
    conf,
    `/calendars/${encodeURIComponent(conf.calendarId)}/events/${encodeURIComponent(eventId)}`,
  );
  if (!result.ok) return null;
  return { eventId: result.data.id, meetLink: meetLinkOf(result.data) };
}

/**
 * Adds one guest, and has Google send them the invitation.
 *
 * Read-modify-write rather than a patch: the attendees array replaces whatever
 * is there, so the existing list has to come back first. Two registrations
 * landing in the same instant can therefore lose one — the caller serialises on
 * the session document, and the reconcile path in the API route catches any
 * that still slip through.
 */
export async function addSeminarGuest(
  eventId: string,
  guest: { email: string; name?: string },
): Promise<boolean> {
  const conf = config();
  if (!conf) return false;

  const path = `/calendars/${encodeURIComponent(conf.calendarId)}/events/${encodeURIComponent(eventId)}`;
  const current = await api<GoogleEvent>(conf, path);
  if (!current.ok) return false;

  const attendees = current.data.attendees ?? [];
  const email = guest.email.toLowerCase();
  if (attendees.some((a) => a.email?.toLowerCase() === email)) return true;

  const updated = await api<GoogleEvent>(conf, `${path}?sendUpdates=all&conferenceDataVersion=1`, {
    method: "PATCH",
    body: JSON.stringify({
      attendees: [...attendees, { email: guest.email, displayName: guest.name || undefined }],
    }),
  });
  return updated.ok;
}
