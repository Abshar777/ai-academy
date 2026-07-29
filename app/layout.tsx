import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delta AI Academy — Build AI powered applications",
  description:
    "Build AI powered applications even if you've never coded before. Learn React, React Native, FastAPI and MongoDB with AI assisted tools, and ship three real projects.",
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
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
