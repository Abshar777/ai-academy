"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FAQ_BOT_ENTRIES, matchFaq } from "@/lib/faq-bot";
import { ChatEnrollForm } from "./chat-enroll-form";

/**
 * Floating "chat with AI" widget — entirely local. There's no model call: a
 * typed question is matched against a fixed set of preset Q&A by keyword
 * overlap (see lib/faq-bot.ts), and the closest match's canned answer is
 * shown. No API key, no per-message cost, no rate limit, ever — the
 * tradeoff is that it can only answer what's in that list. Anything with no
 * decent match gets a fallback pointing at Join now / Get the brochure
 * rather than a guess.
 */

type Role = "user" | "assistant";
/** kind: "enroll" renders the inline sign-up-and-pay form (chat-enroll-form.tsx)
 *  in place of plain text — content is still shown above it as the lead-in
 *  line. */
type Message = { role: Role; content: string; kind?: "enroll" };

const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I can answer common questions about the programme instantly. Tap one below, or type your own.",
};

const FALLBACK =
  "I don't have a preset answer for that one — tap a question below, or use “Join now” / “Get the brochure” to ask the team directly.";

const ENROLL_LEAD_IN =
  "Great — you can enrol right here. Pop in your details below and I'll take you straight to payment.";

/** Shown before the visitor has asked anything. "Enrol now" is first and
 *  distinctly styled — it's the one action that skips the Q&A entirely and
 *  drops the enrol form straight into the chat. */
const STARTER_QUESTIONS = [
  "What will I build during the programme?",
  "Do I need any coding experience to join?",
  "What does it cost?",
  "How is the course structured?",
];

// A little processing delay reads as more natural than an instant teleport,
// and gives the typing indicator a moment to actually be seen.
const REPLY_DELAY_MS = 350;

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.3 3.6a.5.5 0 0 1-.7-.38V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path
        d="M3 3l10 10M13 3 3 13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AiChatWidget() {
  const [isFocus,setFocus]=useState(true)
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, pending]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // Scheduled rather than set synchronously — a sync setState here would
    // trigger a cascading render. Each open is a fresh session: reopening
    // after a closed conversation should feel like starting over, not
    // resuming, and it's what brings the suggestion chips back after
    // they've hidden themselves.
    const timer = window.setTimeout(() => {
      setMessages([GREETING]);
      setShowAllQuestions(false);
      setDraft("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  function ask(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setDraft("");
    setPending(true);

    // The existing "How do I join?" entry used to just point at the "Join
    // now" button elsewhere on the page — now that there's somewhere to
    // actually finish enrolling right here, that match drops the form in
    // instead of only describing where to find it.
    const matched = matchFaq(content);
    const isEnrollIntent = matched?.question === "How do I join?";
    const answer = isEnrollIntent ? ENROLL_LEAD_IN : (matched?.answer ?? FALLBACK);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, kind: isEnrollIntent ? "enroll" : undefined },
      ]);
      setPending(false);
    }, REPLY_DELAY_MS);
  }

  function startEnroll() {
    if (pending) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "I'd like to enrol." },
      { role: "assistant", content: ENROLL_LEAD_IN, kind: "enroll" },
    ]);
    setFocus(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    // items-end matters here: this box has no declared width, so it
    // shrink-to-fits its widest child. With only the 56px toggle button
    // present that's a no-op, but once the ~345px panel mounts as a sibling,
    // the wrapper grows to match it — and a plain block child (the button)
    // defaults to the START edge of that now-wider box, i.e. it visually
    // jumps to the left. items-end pins every child to the same right edge
    // regardless of how wide the wrapper ends up being.
    //
    // z-[51], not z-40: the mobile nav bar is z-50, and on mobile this panel
    // goes full-screen — at z-40 the nav bar (a sibling, outside this
    // subtree) would win the stacking fight and poke through the top of the
    // chat regardless of DOM order, since an explicit z-index always beats
    // paint order between sibling stacking contexts.
    <div className="fixed right-4 bottom-4 z-[51] flex flex-col items-end sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            // Mobile-first: a small floating card has no good size on a phone
            // — either it's cramped, or "big enough" bumps into the exact
            // keyboard/viewport issues below. Full-screen sidesteps both, and
            // is the standard pattern (Intercom, Crisp, etc.) for exactly this
            // reason. sm: reintroduces the corner-anchored card for desktop,
            // where there's room to spare and full-screen would feel heavy.
            //
            // dvh, not vh, on the desktop card: vh is the height with no
            // keyboard open and never shrinks back — with the keyboard up,
            // "70vh" is taller than what's actually visible, so the input row
            // gets pushed below the fold and the OS scrolls the page to chase
            // it. dvh tracks the real visible viewport. overscroll-contain
            // stops that same scroll from bleeding through to the page behind
            // the widget once you're at the top/bottom of the message list.
            // overflow-x-hidden is a hard backstop so nothing in here can
            // ever become a sideways scroller.
            className="fixed inset-0 z-[51] flex h-[100dvh] w-full flex-col overflow-hidden overscroll-contain bg-white sm:static sm:inset-auto sm:z-auto sm:mb-3 sm:h-[min(70dvh,560px)] sm:w-[min(92vw,380px)] sm:rounded-3xl sm:border sm:border-neutral-90/10 sm:shadow-[0_16px_48px_rgb(0_0_0_/_0.18)]"
          >
            {/* Extra top padding on mobile only: full-screen now means this
                header sits right under the notch/status bar. */}
            <div className="flex items-center justify-between border-b border-neutral-90/8 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:pt-4">
              <div className="flex flex-col">
                <span className="font-noi-grotesk text-[15px] leading-[1.2] font-medium tracking-[-0.015em]">
                  Ask Delta AI
                </span>
                <span className="font-noi-grotesk text-[13px] leading-[1.2] tracking-[-0.015em] text-neutral-50">
                  Instant answers, no waiting
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex size-8 items-center justify-center rounded-full text-neutral-50 transition-colors duration-150 hover:bg-neutral-10 hover:text-neutral-90"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4"
            >
              <ul className="flex list-none flex-col gap-3">
                {messages.map((m, i) =>
                  m.kind === "enroll" ? (
                    <li key={i} className="flex justify-start">
                      <div className="flex w-[92%] max-w-[92%] flex-col gap-3 rounded-2xl rounded-bl-md bg-neutral-10 px-4 py-3 text-neutral-90">
                        <ChatEnrollForm />
                      </div>
                    </li>
                  ) : (
                    <li
                      key={i}
                      className={
                        "flex " + (m.role === "user" ? "justify-end" : "justify-start")
                      }
                    >
                      <p
                        className={
                          "max-w-[85%] rounded-2xl px-4 py-2.5 font-noi-grotesk text-[14px] leading-[1.45] tracking-[-0.015em] text-pretty whitespace-pre-wrap " +
                          (m.role === "user"
                            ? "rounded-br-md bg-neutral-90 text-white"
                            : "rounded-bl-md bg-neutral-10 text-neutral-90")
                        }
                      >
                        {m.content}
                      </p>
                    </li>
                  ),
                )}
                {pending && (
                  <li className="flex justify-start">
                    <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-10 px-4 py-2.5">
                      <span className="inline-flex gap-1 py-0.5">
                        <span className="size-1.5 animate-bounce rounded-full bg-neutral-50 [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-neutral-50 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-neutral-50 [animation-delay:300ms]" />
                      </span>
                    </p>
                  </li>
                )}
              </ul>
            </div>

            {/* Only shown before a real exchange has happened — once you've
                asked something, the transcript is the point, not a wall of
                suggestion chips competing with it. Opening the widget fresh
                (see the effect below) brings this back. */}
            {isFocus && (
              // flex-wrap always stacks these onto new rows by width alone —
              // overflow-x-hidden is a hard guarantee it can never instead
              // become a sideways-scrolling strip.
              <div className="flex max-w-full flex-wrap gap-2 overflow-x-hidden border-t border-neutral-90/8 px-5 pt-3 pb-3">
                {/* Distinctly styled — this is the one chip that skips the
                    Q&A and drops the actual sign-up-and-pay form straight
                    into the chat, not another canned answer. */}
                {!showAllQuestions && (
                  <button
                    type="button"
                    onClick={startEnroll}
                    disabled={pending}
                    className="rounded-full bg-lime-30 px-3 py-1.5 font-noi-grotesk text-[13px] leading-[1.3] font-medium tracking-[-0.015em] text-black transition-colors duration-150 hover:bg-lime-40 disabled:opacity-50"
                  >
                    Enrol now →
                  </button>
                )}
                {(showAllQuestions
                  ? FAQ_BOT_ENTRIES.map((e) => e.question)
                  : STARTER_QUESTIONS
                ).map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => {
                      ask(question)
                      setTimeout(() => setFocus(false), 100)
                    }}
                    disabled={pending}
                    className="rounded-full border border-neutral-90/15 px-3 py-1.5 font-noi-grotesk text-[13px] leading-[1.3] tracking-[-0.015em] transition-colors duration-150 hover:bg-neutral-10 disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowAllQuestions((v) => !v)
                    setTimeout(() => setFocus(true), 600)
                  }}
                  className="rounded-full px-3 py-1.5 font-noi-grotesk text-[13px] leading-[1.3] font-medium tracking-[-0.015em] text-neutral-50 transition-colors duration-150 hover:text-neutral-90"
                >
                  {showAllQuestions ? "View less" : "More questions…"}
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-neutral-90/8 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
            >
              {/* text-[16px], not smaller: iOS Safari auto-zooms the whole
                  page on focus for any input under 16px, which is jarring in
                  something meant to feel like part of the app. */}
              <input
                ref={inputRef}
                value={draft}
                onFocus={e => { setFocus(true) }}
                onBlur={e => { setTimeout(() => setFocus(false), 500) }}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your question…"
                maxLength={300}
                className="h-11 flex-1 rounded-xl border border-neutral-90/12 bg-neutral-10/60 px-4 font-noi-grotesk text-[16px] tracking-[-0.015em] outline-none transition-colors duration-150 focus:border-neutral-90/30"
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                aria-label="Send"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lime-30 text-black transition duration-150 ease-in-out hover:bg-lime-40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
                  <path d="M2.5 17.5 18 10 2.5 2.5 2.5 8l10.5 2-10.5 2z" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Chat with AI"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        // Hidden on mobile while open: the full-screen panel has its own
        // close button in the header, and this one would otherwise float
        // uselessly on top of it. Always shown on desktop, where the panel
        // never covers it.
        className={
          "size-14 items-center justify-center rounded-full bg-neutral-90 text-white shadow-[0_8px_24px_rgb(0_0_0_/_0.24)] transition-colors duration-150 hover:bg-neutral-70 sm:flex " +
          (open ? "hidden" : "flex")
        }
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </motion.button>
    </div>
  );
}
