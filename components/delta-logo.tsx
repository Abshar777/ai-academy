import Image from "next/image";

/**
 * Brand marks derived from the supplied logo artwork in public/. Two colour
 * variants: the navy lockup for light surfaces, the white one for dark.
 * They carry the teal accents, so these are real images rather than
 * currentColor masks.
 */

type LogoProps = {
  className?: string;
  variant?: "navy" | "white";
  priority?: boolean;
};

const suffix = (v: LogoProps["variant"]) => (v === "white" ? "-white" : "");

/** "delta" wordmark only — the nav bar is too short for the stacked lockup. */
export function DeltaWordmark({ className, variant, priority = true }: LogoProps) {
  return (
    <Image
      src={`/brand/delta-wordmark${suffix(variant)}.png`}
      alt="Delta AI Academy"
      width={1600}
      height={604}
      priority={priority}
      sizes="(min-width: 1280px) 1600px, 100vw"
      className={className}
    />
  );
}

/** The "d" monogram, for the condensed nav and small slots. */
export function DeltaMark({ className, variant }: LogoProps) {
  return (
    <Image
      src={`/brand/delta-mark${suffix(variant)}.png`}
      alt="Delta AI Academy"
      width={385}
      height={548}
      className={className}
    />
  );
}

/** Full stacked lockup, wordmark over "AI ACADEMY". */
export function DeltaLogo({ className, variant }: LogoProps) {
  return (
    <Image
      src={`/brand/delta-logo${suffix(variant)}.png`}
      alt="Delta AI Academy"
      width={1600}
      height={721}
      className={className}
    />
  );
}
