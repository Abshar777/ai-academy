"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { saveContactDetails } from "@/lib/contact-storage";
import { sendWelcomeEmailRequest } from "@/lib/send-welcome-email-request";
import { readCountryCookie } from "@/lib/country-cookie";

type ContactContextValue = { open: (source?: string) => void };

const ContactContext = createContext<ContactContextValue | null>(null);

/** Opens the enquiry dialog. Available to anything inside <ContactProvider>. */
export function useContact() {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error("useContact must be used inside <ContactProvider>");
  return ctx;
}

type Status = "idle" | "sending" | "sent" | "error";

const FIELD =
  "h-12 w-full rounded-lg border border-neutral-90/15 bg-white px-4 font-noi-grotesk text-[16px] tracking-[-0.015em] outline-none transition-colors duration-150 focus:border-neutral-90";
const LABEL =
  "font-noi-grotesk text-[14px] leading-[1.4] font-medium tracking-[-0.015em]";
const ERROR =
  "font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-[#c0392b]";

/**
 * There's no real checkout on this site — no merchant account to charge a
 * card against. This is what "buy" actually means here: the visitor states
 * how they'd want to pay, that comes through with the rest of the enquiry,
 * and the team follows up with the right payment link already in hand
 * instead of a second round-trip to ask.
 */
const PAYMENT_METHODS = [
  { value: "full", label: "Pay in full" },
  { value: "tabby", label: "Tabby" },
  { value: "tamara", label: "Tamara" },
  { value: "razorpay", label: "Razorpay" },
] as const;

function ContactDialog({
  dialogRef,
  source,
  onClose,
  onSent,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  source: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>(
    "full",
  );
  const routre=useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim();
    const phone = String(data.phone ?? "").trim();

    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      errors.email = "Please enter a valid email address.";
    if (phone.replace(/\D/g, "").length < 7)
      errors.phone = "Please enter a valid phone number.";

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setStatus("idle");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      // NOTE: no endpoint yet — point this at the real one (or a form service)
      // and delete the simulated delay below.
      await new Promise((r) => setTimeout(r, 600));
      console.info("Enquiry", { ...data, source });
      // Whichever of the three forms on the site gets filled in first,
      // prefills the other two — see lib/contact-storage.ts.
      saveContactDetails({ name, email, phone });
      // This dialog has no country field of its own — the cookie is a
      // best-effort hint from whichever of /order or the chat form the
      // visitor touched first, if any (see lib/country-cookie.ts). Empty
      // string when unset, which lib/whatsapp.ts treats the same as "no
      // country available".
      sendWelcomeEmailRequest({ name, email, phone, country: readCountryCookie() });
      setFieldErrors({});
      form.reset();
      setPaymentMethod("full");
      setStatus("idle");
      dialogRef.current?.close();
      routre.push('/order')
      onSent();
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        setStatus("idle");
        onClose();
      }}
      // Clicking the backdrop closes; clicks inside the panel are stopped below.
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="contact-title"
      className="contact-dialog m-auto w-[min(100vw-32px,520px)] rounded-3xl bg-white p-0 text-neutral-90 backdrop:bg-neutral-90/60"
    >
      <div className="flex flex-col gap-8 p-8 md:p-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <h2
              id="contact-title"
              className="font-noi-grotesk text-[28px] leading-[1.1] tracking-[-0.025em] md:text-[32px]"
            >
              Join Delta AI Academy
            </h2>
            <p className="font-noi-grotesk text-[16px] leading-[1.45] tracking-[-0.015em] text-neutral-50">
              Leave your details and our team will get back to you about the
              programme.
            </p>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-neutral-90/8"
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path
                d="M2 2l12 12M14 2L2 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className={LABEL} htmlFor="contact-name">
                Full name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                className={FIELD}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
              />
              {fieldErrors.name ? (
                <p id="contact-name-error" role="alert" className={ERROR}>
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className={LABEL} htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={FIELD}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
              />
              {fieldErrors.email ? (
                <p id="contact-email-error" role="alert" className={ERROR}>
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className={LABEL} htmlFor="contact-phone">
                Phone number
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="+971 50 000 0000"
                className={FIELD}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "contact-phone-error" : undefined}
              />
              {fieldErrors.phone ? (
                <p id="contact-phone-error" role="alert" className={ERROR}>
                  {fieldErrors.phone}
                </p>
              ) : null}
            </div>

            {/* <fieldset className="flex flex-col gap-2">
              <legend className={LABEL}>How would you like to pay?</legend>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className="cursor-pointer rounded-full border border-neutral-90/15 px-4 py-2 font-noi-grotesk text-[14px] leading-none tracking-[-0.01em] transition-colors duration-150 has-checked:border-neutral-90 has-checked:bg-neutral-90 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-neutral-90 has-focus-visible:ring-offset-2"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                      className="sr-only"
                    />
                    {method.label}
                  </label>
                ))}
              </div>
              <p className="font-noi-grotesk text-[13px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
                No payment happens here — this just tells the team which link to send you.
              </p>
            </fieldset> */}

            {error ? (
              <p role="alert" className="font-noi-grotesk text-[15px] text-[#c0392b]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-1 inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-5 font-noi-grotesk text-[18px] leading-none font-medium text-white transition duration-150 hover:bg-neutral-70 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send my details"}
            </button>
          </form>
      </div>
    </dialog>
  );
}

/**
 * Success toast. The dialog has already closed by the time this shows, so there
 * is nothing in the top layer to fight — a fixed panel is enough, and works
 * without depending on Popover API support.
 */
function SentToast({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-open={open}
      className="contact-toast fixed inset-x-4 bottom-6 z-[60] rounded-2xl bg-neutral-90 text-white sm:inset-x-auto sm:right-6 sm:w-[380px]"
    >
      <div className="flex items-start gap-4 p-5">
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-lime-30"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path
              d="M3.5 8.5l3 3 6-6.5"
              stroke="#14151c"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>

        <div className="flex flex-col gap-1">
          <p className="font-noi-grotesk text-[16px] leading-[1.3] font-medium tracking-[-0.015em]">
            Thanks — we&rsquo;ll be in touch
          </p>
          <p className="font-noi-grotesk text-[15px] leading-[1.4] tracking-[-0.015em] text-white/65">
            We have your details and will get back to you shortly.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 ml-auto flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/10"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path
              d="M2 2l12 12M14 2L2 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ContactProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const [source, setSource] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const hideToast = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setToastOpen(false);
  }, []);

  const showToast = useCallback(() => {
    setToastOpen(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setToastOpen(false), 6000);
  }, []);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const open = useCallback((from = "") => {
    setSource(from);
    dialogRef.current?.showModal();
  }, []);

  // showModal() traps focus and wires Escape for us; this only stops the page
  // behind from scrolling while the dialog is up.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const lock = () => {
      document.body.style.overflow = dialog.open ? "hidden" : "";
    };
    const observer = new MutationObserver(lock);
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return () => {
      observer.disconnect();
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <ContactContext.Provider value={{ open }}>
      {children}
      <ContactDialog
        dialogRef={dialogRef}
        source={source}
        onClose={() => setSource("")}
        onSent={showToast}
      />
      <SentToast open={toastOpen} onDismiss={hideToast} />
    </ContactContext.Provider>
  );
}

/** Drop-in replacement for the CTA links — same classes, opens the dialog. */
export function ContactButton({
  children,
  className,
  source,
}: {
  children: ReactNode;
  className?: string;
  source?: string;
}) {
  const { open } = useContact();
  return (
    <button type="button" className={className} onClick={() => open(source)}>
      {children}
    </button>
  );
}
