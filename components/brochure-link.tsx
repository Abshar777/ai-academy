import type { ReactNode } from "react";
import { BROCHURE_HREF } from "@/lib/site";

type BrochureLinkProps = {
  children: ReactNode;
  className?: string;
  /** For analytics. Every brochure link on the site is a separate one to
   *  count, so the id names the place rather than the action. */
  id?: string;
};

/**
 * Opens the brochure PDF in a new tab.
 *
 * A real anchor rather than a button with a window.open() handler: it works
 * with JS disabled, respects cmd/ctrl/middle-click and "open link in new tab",
 * and needs no `typeof window` guard — onClick handlers only ever run in the
 * browser regardless, so that guard was never doing anything.
 */
export function BrochureLink({ children, className, id }: BrochureLinkProps) {
  return (
    <a
      id={id}
      href={BROCHURE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
