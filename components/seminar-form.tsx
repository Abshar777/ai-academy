"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { COUNTRY_OPTIONS } from "@/lib/pricing";
import { useCountry } from "@/lib/use-country";
import { loadContactDetails, saveContactDetails } from "@/lib/contact-storage";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/contact-validation";
import { formatWebinarDate, formatWebinarTime, type WebinarSession } from "@/lib/next-webinar";

const FIELD =
  "h-12 w-full rounded-lg border border-neutral-90/15 bg-white px-4 font-noi-grotesk text-[16px] tracking-[-0.015em] outline-none transition-colors duration-150 focus:border-neutral-90";
const LABEL = "font-noi-grotesk text-[14px] leading-[1.4] font-medium tracking-[-0.015em]";
const ERROR = "font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-[#c0392b]";

/**
 * Pause before handing a new registrant to the WhatsApp community.
 *
 * Not zero. The booking has just succeeded and this screen is the only place
 * that says so — jumping straight out of it reads as the form having failed,
 * and takes the Meet link away with it. Three seconds is enough to see "your
 * seat is booked" and the date, and short enough that nobody sits waiting.
 */
const REDIRECT_AFTER_SECONDS = 3;

type BookedState = {
  when: string;
  meetLink: string | null;
  communityUrl: string | null;
  alreadyRegistered: boolean;
};

/**
 * Booking a seat at the free seminar.
 *
 * Country is asked for because of what happens after: lib/whatsapp.ts cannot
 * turn "0501234567" into a number Meta will accept without knowing whether
 * that is a UAE or a Saudi line — the digits are identical. Without it every
 * non-Indian registrant silently gets no WhatsApp message.
 */
export function SeminarForm({
  session,
  compact = false,
}: {
  session: WebinarSession | null;
  /** The mobile prompt's copy of the form: no country row, tighter padding.
   *  Country still travels — it is the detected one rather than a chosen one. */
  compact?: boolean;
}) {
  // Two copies of this form share the page on mobile — the one in the layout
  // and the one in the prompt. Fixed ids would collide, and every label would
  // point at whichever rendered first.
  const uid = useId();
  const detectedCountry = useCountry();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [booked, setBooked] = useState<BookedState | null>(null);

  // Deferred a tick: the lint rule flags a setState the effect body can reach
  // synchronously, and the server renders none of this anyway.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = loadContactDetails();
      if (saved?.name) setName(saved.name);
      if (saved?.email) setEmail(saved.email);
      if (saved?.phone) setPhone(saved.phone);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (detectedCountry) {
      const id = window.setTimeout(() => setCountry((current) => current || detectedCountry), 0);
      return () => window.clearTimeout(id);
    }
  }, [detectedCountry]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (!isValidName(name)) errors.name = "Please enter your name.";
    if (!isValidEmail(email)) errors.email = "Please enter a valid email address.";
    if (!isValidPhone(phone)) errors.phone = "Please enter a valid phone number.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setStatus("sending");
    setErrorMessage("");
    try {
      const response = await fetch("/api/seminar/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, country }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setStatus("error");
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      saveContactDetails({ name, email, phone });
      setBooked({
        when: data.when,
        meetLink: data.meetLink ?? null,
        communityUrl: data.communityUrl ?? null,
        alreadyRegistered: Boolean(data.alreadyRegistered),
      });
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-neutral-10 p-8 text-center md:p-10">
        <h1 className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em]">
          No seminar scheduled right now
        </h1>
        <p className="font-noi-grotesk text-[15px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
          The next date isn&rsquo;t announced yet. Check back soon, or join the programme and start today.
        </p>
      </div>
    );
  }

  const start = new Date(session.startsAt);

  if (booked) return <BookedSeat booked={booked} />;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`flex flex-col gap-5 rounded-3xl bg-neutral-10 ${compact ? "p-6" : "p-8 md:p-10"}`}
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em]">
          Book your free seat
        </h1>
        <p className="font-noi-grotesk text-[14px] leading-[1.45] tracking-[-0.015em] text-neutral-50">
          {formatWebinarDate(start)} · {formatWebinarTime(start)} — live on Google Meet
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL} htmlFor={`${uid}-name`}>Full name</label>
        <input
          id={`${uid}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className={FIELD}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name && <p className={ERROR}>{fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL} htmlFor={`${uid}-email`}>Email</label>
        <input
          id={`${uid}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={FIELD}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email && <p className={ERROR}>{fieldErrors.email}</p>}
        <p className="font-noi-grotesk text-[13px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
          Your calendar invite goes here — use the address your calendar is on.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL} htmlFor={`${uid}-phone`}>Phone number</label>
        <input
          id={`${uid}-phone`}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 50 000 0000"
          autoComplete="tel"
          className={FIELD}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone && <p className={ERROR}>{fieldErrors.phone}</p>}
      </div>

      <div className={`flex-col gap-2 ${compact ? "hidden" : "flex"}`}>
        <label className={LABEL} htmlFor={`${uid}-country`}>Country</label>
        <select
          id={`${uid}-country`}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={FIELD}
        >
          <option value="">Select your country</option>
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>{option.name}</option>
          ))}
        </select>
      </div>

      {status === "error" && <p role="alert" className={ERROR}>{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-1 inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-5 font-noi-grotesk text-[18px] leading-none font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
      >
        {status === "sending" ? "Booking your seat…" : "Book my free seat"}
      </button>

      <p className="font-noi-grotesk text-[13px] leading-[1.45] tracking-[-0.015em] text-neutral-50">
        Free, no card needed. We&rsquo;ll send the joining link and a calendar invite.
      </p>
    </form>
  );
}

function BookedSeat({ booked }: { booked: BookedState }) {
  const community = booked.communityUrl;
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_AFTER_SECONDS);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!community || cancelled) return;
    const tick = window.setInterval(
      () => setSecondsLeft((n) => Math.max(0, n - 1)),
      1000,
    );
    const go = window.setTimeout(() => {
      // A top-level navigation rather than window.open: a popup opened this
      // long after the click — with no gesture behind it — is blocked by
      // default, and the person would land nowhere at all.
      window.location.href = community;
    }, REDIRECT_AFTER_SECONDS * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, [community, cancelled]);

  return (
    <div className="flex flex-col items-start gap-5 rounded-3xl bg-neutral-10 p-8 md:p-10">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-lime-30">
        <svg viewBox="0 0 16 16" className="size-6" aria-hidden>
          <path d="M3.5 8.5l3 3 6-6.5" stroke="#14151c" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em]">
          {booked.alreadyRegistered ? "You're already booked" : "Your seat is booked"}
        </h1>
        <p className="font-noi-grotesk text-[15px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
          {booked.when}. A Google Calendar invitation is on its way to your email — accept it and the
          joining link sits in your calendar, with a reminder before we start.
        </p>
      </div>

      {community && !cancelled && (
        // aria-live, because a page that moves on its own has to say so to
        // somebody who cannot see the countdown.
        <p
          aria-live="polite"
          className="font-noi-grotesk text-[15px] leading-[1.45] tracking-[-0.015em]"
        >
          Taking you to the WhatsApp community
          {secondsLeft > 0 ? ` in ${secondsLeft}…` : "…"}{" "}
          <button
            type="button"
            onClick={() => setCancelled(true)}
            className="underline underline-offset-2 transition-colors duration-150 hover:text-neutral-50"
          >
            Stay here
          </button>
        </p>
      )}

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        {community && (
          <a
            href={community}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 font-noi-grotesk text-[16px] leading-none font-medium text-white transition duration-150 hover:brightness-95"
          >
            Join the WhatsApp community
          </a>
        )}
        {booked.meetLink && (
          <a
            href={booked.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-neutral-90 px-6 font-noi-grotesk text-[16px] leading-none font-medium transition duration-150 hover:bg-neutral-90/8"
          >
            Save the meeting link
          </a>
        )}
      </div>
    </div>
  );
}

export function SeminarPoster({ session }: { session: WebinarSession | null }) {
  if (!session) return null;
  const start = new Date(session.startsAt);
  return (
    <Image
      src={session.poster}
      alt={`${session.title} — ${formatWebinarDate(start)} at ${formatWebinarTime(start)}, with ${session.speaker}`}
      width={1080}
      height={1350}
      className="h-auto w-full rounded-3xl"
      priority
    />
  );
}
