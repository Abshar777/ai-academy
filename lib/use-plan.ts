"use client";

import { offerToPlan } from "./offer-shape";
import { planForCountry, type PricingPlan } from "./pricing";
import { useCountry } from "./use-country";
import { useOffer } from "./use-offer";

/**
 * The plan this visitor is actually being sold, country pricing or a custom
 * link, resolved in one place.
 *
 * Every price on the site goes through here, which is what makes a custom
 * link behave: open one and the enrol bar, the offer banner, the pricing
 * section, the chat form and /order all quote the agreed figure, because none
 * of them decides a price for itself.
 *
 * An offer beats the country plan, and keeps beating it when the country
 * changes — that is the whole promise of the link. The country still decides
 * the dial code and, on ordinary pricing, the gateway.
 */
export function useActivePlan(): PricingPlan {
  const country = useCountry();
  const offer = useOffer();
  return offer ? offerToPlan(offer) : planForCountry(country);
}
