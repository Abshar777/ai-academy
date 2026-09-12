import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OrderForm } from "@/components/order-form";
import { AlreadyEnrolledGuard } from "@/components/already-enrolled-guard";
import { countryFromParam } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Join the programme",
  description: "Confirm your details and how you'd like to pay to join Delta AI Academy.",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.country;
  // A `?country=` link (e.g. /order?country=india or ?country=uae) preselects
  // the plan and wins over geo-detection — useful for country-specific campaign
  // links. Falls through to the `country` cookie middleware.ts sets from
  // Vercel's geo header (empty in local dev) when the param is absent/unknown.
  const fromQuery = countryFromParam(Array.isArray(raw) ? raw[0] : raw);
  const country = fromQuery || ((await cookies()).get("country")?.value ?? "");

  // ?coupon=ABC123 — for codes sent to somebody directly, so the discount is
  // already applied when they land rather than depending on them retyping it.
  // Normalized here because codes are stored uppercase and a link pasted from
  // an email often arrives lowercased.
  const couponRaw = params.coupon;
  const coupon = (Array.isArray(couponRaw) ? couponRaw[0] : couponRaw)?.trim().toUpperCase() ?? "";
  return (
    <>
      <AlreadyEnrolledGuard />
      <OrderForm initialCountry={country} initialCoupon={coupon} />
    </>
  );
}
