import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { ContactProvider } from "@/components/contact-dialog";
import { SiteChrome } from "@/components/site-chrome";

const TITLE = `${SITE_NAME} — Build AI powered applications`;

export const metadata: Metadata = {
  // Lets every relative URL below (icons, OG image, canonical) resolve to a
  // real absolute URL — without it Next can't build the og:image tag at all.
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Delta AI Academy",
    "learn to code with AI",
    "AI coding bootcamp",
    "vibe coding",
    "Claude Code course",
    "Lovable course",
    "React bootcamp",
    "React Native course",
    "build apps without coding",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" }, // Your 48x48 icon
    ],
   
    other: [
      { rel: "icon", url: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", url: "/favicon.ico", sizes: "16x16" },
    ],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/favicon.ico",
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
    // No explicit `images` — Next resolves it from app/opengraph-image.tsx.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  formatDetection: {
    // Stops iOS Safari from auto-linking things like "AED 99" or a stray
    // phone-shaped number in the copy as a tel: link.
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

/** Organization markup — the only structured data a one-page site needs;
 *  course/offer schema would be overclaiming without real review/price data
 *  Google can independently verify. */
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Without these the browser doesn't discover the faces until it has
            parsed the CSS and laid out text that needs them — measured at
            ~1.4s in, which is most of the way to the curtain lifting. These
            are the three used above the fold; the rest can wait.

            crossOrigin is required even same-origin: fonts are fetched in CORS
            mode, and a preload without it is simply fetched twice. */}
        <link
          rel="preload"
          href="/fonts/SansPlomb-600.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/NoiGrotesk-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/NoiGrotesk-500.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Pinned-tab icon for older Safari. Deliberately a plain <link> here
            rather than metadata.icons: setting that field at all — even for
            an entry it doesn't otherwise reference — tells Next.js the icons
            are fully hand-specified, and it stops auto-generating the <link>
            tags for the app/icon.png and app/apple-icon.png conventions. */}
        <link rel="mask-icon" href="/icons/icon-512.png" color="#14151c" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body className="min-h-full">
        <ContactProvider>
          <SiteChrome>{children}</SiteChrome>
        </ContactProvider>
      </body>
    </html>
  );
}
