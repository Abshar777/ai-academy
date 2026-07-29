import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OrderForm } from "@/components/order-form";

export const metadata: Metadata = {
  title: "Join the programme",
  description: "Confirm your details and how you'd like to pay to join Delta AI Academy.",
  robots: { index: false, follow: false },
};

export default async function OrderPage() {
  // Set by middleware.ts from Vercel's geo header — empty string in local
  // dev, where there's no edge network in front of the request to set it.
  const country = (await cookies()).get("country")?.value ?? "";
  return <OrderForm initialCountry={country} />;
}
