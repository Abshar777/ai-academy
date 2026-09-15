/**
 * A small ring that turns. Inherits the text colour of whatever it sits in,
 * so the same mark works on a dark button and on a light card; sized in em so
 * it matches the text beside it.
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`inline-block h-[1.05em] w-[1.05em] shrink-0 animate-spin motion-reduce:animate-none ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
