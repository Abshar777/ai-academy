"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/*
 * Social-proof "recent enrolment" toasts — a small card slides in bottom-left
 * every so often ("Riya Nair enrolled in the course 'AI Academy' · 34 minutes
 * ago"), cycles through a pool of names, and repeats. Marketing FOMO, the same
 * pattern the landing pages of most course sites run.
 *
 * Names are a fixed, shuffled pool (not real customers), shown one at a time
 * with a randomised "minutes ago" so it reads as a live feed. Dismissable, and
 * it honours prefers-reduced-motion. Mounted on the marketing pages only.
 */

const NAMES = [
  "Jabir K", "Sajith Kunnath", "Arjun R", "Sneha Nair", "Muhammed Rashid",
  "Anjali Menon", "Vishnu Prasad", "Fathima Zahra", "Aravind Krishna", "Neha S",
  "Rahul Dev", "Aisha Beevi", "Nikhil Varma", "Deepak Kumar", "Meera Pillai",
  "Sachin Thomas", "Reshma K", "Abhinav Raj", "Sruthi Nair", "Jithin Joseph",
  "Ananya S", "Farhan Ali", "Gokul Krishna", "Divya Menon", "Hari Prasad",
  "Karthik R", "Lakshmi Nair", "Manoj Kumar", "Nithin George", "Praveen Das",
  "Roshan Thomas", "Shalini R", "Tijo Varghese", "Vidya Krishnan", "Yadu Krishnan",
  "Aparna S", "Basil Joseph", "Irfan Ahmed", "Keerthana R", "Sandeep Nair",
  "Ashwin Menon", "Nimisha P", "Rohit Sharma", "Priya Nair", "Sanjay Kumar",
  "Diya Krishna", "Akhil Raj", "Swathi R", "Vivek Nambiar", "Riya Thomas",
  "Amal Jyothi", "Nandana S", "Kevin Joseph", "Athira Nair", "Sreejith K",
  "Megha Pillai", "Alan Varghese", "Haritha R", "Naveen Kumar", "Anusree S",
  "Fahad Rahman", "Gayathri Menon", "Jerin George", "Lena Thomas", "Midhun Raj",
  "Namitha S", "Pranav Krishna", "Rithika Nair", "Sahil Ahmed", "Thejus P",
  "Aromal K", "Bhavana R", "Christo Joseph", "Devika Nair", "Emil Varghese",
  "Ganesh Kumar", "Hiba Fathima", "Ishaan R", "Jyotsna Menon", "Kiran Das",
  "Liya Thomas", "Mohan Krishna", "Nithya S", "Ovais Ahmed", "Parvathy Nair",
  "Rakesh Kumar", "Saniya Beevi", "Tanvi R", "Ujwal Menon", "Vaishnav K",
  "Aditya Sharma", "Bincy Joseph", "Chandana Nair", "Dileep Kumar", "Elizabeth Thomas",
  "Faizal Rahman", "Gauri Menon", "Hemanth R", "Ilyas Ahmed", "Jishnu Krishna",
  "Kalyani S", "Labeeb K", "Anagha Nair", "Yohan Varghese", "Zainab Fathima",
];

/** How the relative time reads — weighted toward "minutes ago" so it feels live. */
function relativeTime(): string {
  const r = Math.random();
  if (r < 0.15) return "just now";
  if (r < 0.8) return `${2 + Math.floor(Math.random() * 57)} minutes ago`;
  if (r < 0.95) return "1 hour ago";
  return `${2 + Math.floor(Math.random() * 4)} hours ago`;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Toast = { id: number; name: string; time: string };

export function EnrollmentToasts({
  course = "AI Academy",
  firstDelayMs = 4500,
  visibleMs = 5500,
  gapMs = 7000,
}: {
  course?: string;
  firstDelayMs?: number;
  visibleMs?: number;
  gapMs?: number;
}) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);
  const order = useRef<string[]>([]);
  const cursor = useRef(0);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    order.current = shuffle(NAMES);

    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    const hide = () => {
      setLeaving(true);
      timers.current.push(
        window.setTimeout(() => {
          setToast(null);
          setLeaving(false);
          timers.current.push(window.setTimeout(show, gapMs + Math.random() * gapMs));
        }, reduce ? 0 : 320),
      );
    };

    const show = () => {
      if (cursor.current >= order.current.length) {
        order.current = shuffle(NAMES);
        cursor.current = 0;
      }
      const name = order.current[cursor.current++]!;
      setLeaving(false);
      setToast({ id: seq.current++, name, time: relativeTime() });
      timers.current.push(window.setTimeout(hide, visibleMs));
    };

    timers.current.push(window.setTimeout(show, firstDelayMs));
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setLeaving(true);
    window.setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, 200);
  }

  if (!toast || typeof document === "undefined") return null;

  // Portal to <body> so `position: fixed` pins to the viewport — several
  // marketing pages have transformed ancestors (reveal/scroll animations),
  // and a fixed element inside one is positioned relative to it, not the page.
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 left-3 z-[60] sm:bottom-6 sm:left-6"
    >
      <div
        className={`pointer-events-auto flex w-[min(20rem,calc(100vw-1.5rem))] items-start gap-3 rounded-2xl bg-white p-3 pr-9 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 ${
          leaving ? "toast-leave" : "toast-enter"
        }`}
        role="status"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[20px]"
          style={{ background: "rgba(236,72,153,0.12)" }}
          aria-hidden
        >
          🎉
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-noi-grotesk text-[13.5px] leading-[1.35] tracking-[-0.01em] text-neutral-90">
            <span className="font-semibold">{toast.name}</span> enrolled in the course{" "}
            <span className="font-semibold underline decoration-neutral-90/30 underline-offset-2">
              &lsquo;{course}&rsquo;
            </span>
          </p>
          <p className="mt-1 font-noi-grotesk text-[12px] text-neutral-50">{toast.time}</p>
          <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-neutral-90/10">
            <span className="toast-bar block h-full rounded-full bg-lime-30" />
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-neutral-40 transition-colors hover:bg-neutral-90/8 hover:text-neutral-70"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <style>{`
        .toast-enter {
          animation: toast-in 0.36s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-leave {
          animation: toast-out 0.28s ease forwards;
        }
        .toast-bar {
          animation: toast-progress ${visibleMs}ms linear forwards;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(10px); }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .toast-enter, .toast-leave, .toast-bar { animation: none; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
