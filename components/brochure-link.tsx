import type { ReactNode } from "react";

/**
 * The source file has spaces in its name, which are invalid unescaped in an
 * href — encoded once here rather than at every call site.
 */
const BROCHURE_HREF = encodeURI("/DELTA AI ACADEMY BROCHURE.pdf");

type BrochureLinkProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Opens the brochure PDF in a new tab.
 *
 * A real anchor rather than a button with a window.open() handler: it works
 * with JS disabled, respects cmd/ctrl/middle-click and "open link in new tab",
 * and needs no `typeof window` guard — onClick handlers only ever run in the
 * browser regardless, so that guard was never doing anything.
 */
export function BrochureLink({ children, className }: BrochureLinkProps) {
  return (
    <a href={BROCHURE_HREF} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
