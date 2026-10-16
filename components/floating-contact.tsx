"use client";

import { CONTACT_WHATSAPP_URL } from "@/lib/site";
import { useEnrollBarVisible } from "@/lib/use-enroll-bar-visible";
import { useStudentCount } from "@/lib/use-student-count";
import { WhatsAppIcon } from "./contact-icons";

/**
 * The bottom-left corner: a WhatsApp button, and the student figure beside it.
 *
 * WhatsApp is where this course is actually sold — most enrolments are talked
 * through there rather than over a call — and until now the only way in was a
 * link in the footer, at the one point in the page someone has already decided
 * to leave.
 *
 * The count rides alongside it rather than standing on its own. A number in a
 * corner by itself is decoration; next to the thing it is meant to make easier
 * to press, it is a reason to press it.
 *
 * Positioning mirrors ai-chat-widget.tsx exactly, on the other side. Both lift
 * clear of components/enroll-bar.tsx on phones, where that bar spans very
 * nearly the full width and would otherwise be sat on; on sm and up the bar is
 * a centred pill with both corners free. Same z-[51] as the chat widget, above
 * the bar's z-40 and the mobile nav's z-50.
 */
export function FloatingContact() {
  const student = useStudentCount();
  const enrollBarVisible = useEnrollBarVisible();

  return (
    <div
      className={
        "fixed left-4 z-[51] flex items-center gap-2.5 transition-[bottom] duration-300 ease-in-out sm:left-6 " +
        (enrollBarVisible ? "bottom-[88px] sm:bottom-6" : "bottom-4 sm:bottom-6")
      }
    >
      <a
        href={CONTACT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition duration-150 ease-in-out hover:scale-105 hover:bg-[#1FBA57] active:scale-95 sm:size-13"
      >
        <WhatsAppIcon className="size-6 sm:size-7" />
      </a>

      {/* Hidden until the figure arrives, so the button never shifts sideways
          to make room for it once the fetch lands. Kept on phones too, just
          tighter: the count is the reason the button gets pressed, and a bare
          green circle in the corner is the version of this that gets ignored.
          It still fits beside the chat bubble at 360px. */}
      {student && (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-90/95 py-1.5 pr-3 pl-2.5 font-noi-grotesk text-[11px] leading-none tracking-[-0.015em] text-white/55 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] backdrop-blur-md sm:gap-2 sm:py-2 sm:pr-3.5 sm:pl-3 sm:text-[12px]">
          <span aria-hidden="true" className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-30 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-lime-30" />
          </span>
          <span className="font-sans-plomb text-[12px] font-semibold text-white tabular-nums sm:text-[13px]">
            {student.headline.toLocaleString("en-IN")}
          </span>
          successful students
        </p>
      )}
    </div>
  );
}
