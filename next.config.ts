import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its AFM font files via fs.readFileSync(__dirname + ...),
  // which only works with its real on-disk __dirname — bundling it rewrites
  // that to a synthetic path and breaks font loading (lib/invoice.ts).
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
