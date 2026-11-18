import { listOffers } from "@/lib/offers";
import { SITE_URL } from "@/lib/site";
import { OfferLinks, type OfferRow } from "@/components/admin/offer-links";

/** A link made a second ago has to be in the list. */
export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const offers = await listOffers();

  if (offers === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to make links here.
      </div>
    );
  }

  /* Dates don't survive the trip to a client component, and nothing else here
     needs narrowing — an offer is already only a price and a code. */
  const rows: OfferRow[] = offers.map((offer) => ({
    code: offer.code,
    amount: offer.amount,
    currency: offer.currency,
    originalAmount: offer.originalAmount,
    note: offer.note,
    maxUses: offer.maxUses,
    usedCount: offer.usedCount,
    active: offer.active,
    createdAt: new Date(offer.createdAt).toISOString(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
          Payment links
        </h1>
        <p className="mt-0.5 font-noi-grotesk text-[13px] text-neutral-50">
          A link with its own price, for one person or one group.
        </p>
      </div>
      <OfferLinks rows={rows} siteUrl={SITE_URL} />
    </div>
  );
}
