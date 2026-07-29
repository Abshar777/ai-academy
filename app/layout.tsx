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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
