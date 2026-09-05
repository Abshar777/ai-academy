import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its AFM font files via fs.readFileSync(__dirname + ...),
  // which only works with its real on-disk __dirname — bundling it rewrites
  // that to a synthetic path and breaks font loading (lib/invoice.ts).
  serverExternalPackages: ["pdfkit"],

  async redirects() {
    return [
      {
        /**
         * www -> apex, so the site has exactly one origin.
         *
         * Both hosts resolve to the same server and used to serve /order
         * identically, which meant checkout could run on either. Razorpay
         * whitelists domains per merchant account and treats www and the
         * apex as two different ones, so payments starting on www were
         * being declined. One canonical origin makes that impossible.
         *
         * `permanent` is a 308 rather than a 301: it preserves the request
         * method, so a POST to an API route on www still arrives as a POST.
         */
        source: "/:path*",
        has: [{ type: "host", value: "www.deltaaiacademy.ai" }],
        destination: "https://deltaaiacademy.ai/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
