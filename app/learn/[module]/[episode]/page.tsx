import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EpisodeView } from "@/components/learn/episode-view";

export const metadata: Metadata = {
  title: "Watch",
  robots: { index: false, follow: false },
};

/**
 * Addressed by module number and episode key — /learn/2/ep-4,
 * /learn/3/ecommerce-hosting — rather than by database id, so the URL says
 * where you are. Keys are unique within a module but not across the course,
 * which is why the module number is part of the path.
 */
export default async function EpisodePage({
  params,
}: {
  params: Promise<{ module: string; episode: string }>;
}) {
  const { module, episode } = await params;
  const moduleOrder = Number(module);
  if (!Number.isInteger(moduleOrder) || moduleOrder < 1) notFound();

  return <EpisodeView moduleOrder={moduleOrder} episodeKey={decodeURIComponent(episode)} />;
}
