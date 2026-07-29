import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Delta",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // These live under public/icons rather than the app/icon.png convention
    // files: Next appends a cache-busting query string to the convention
    // route, and a manifest needs a fixed, predictable URL.
    icons: [
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/apple-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
