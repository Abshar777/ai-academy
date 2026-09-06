"use client";

import { EPISODE_LANGUAGES } from "@/lib/episode";
import type { Lang } from "@/lib/academy-api";

/** Course-level language switch. Sets the language titles and descriptions are
 *  read in, and the one each episode opens in. */
export function LanguageToggle({
  value,
  onChange,
}: {
  value: Lang;
  onChange: (next: Lang) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Course language"
      className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-90/8 p-1"
    >
      {EPISODE_LANGUAGES.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={`rounded-full px-3.5 py-1.5 font-noi-grotesk text-[13px] leading-none font-semibold tracking-[0.02em] transition-colors duration-150 ${
            value === option.id
              ? "bg-neutral-90 text-white"
              : "text-neutral-50 hover:text-neutral-90"
          }`}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
