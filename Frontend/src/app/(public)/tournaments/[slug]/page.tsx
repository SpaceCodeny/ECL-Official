import type { Metadata } from "next";
import { TournamentDetailClient } from "@/components/tournaments/tournament-detail-client";

interface TournamentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TournamentPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Campeonato: ${slug}` };
}

export default async function TournamentDetailPage({ params }: TournamentPageProps) {
  const { slug } = await params;
  return <TournamentDetailClient slug={slug} />;
}
