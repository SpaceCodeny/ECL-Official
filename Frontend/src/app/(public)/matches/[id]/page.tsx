import type { Metadata } from "next";
import { MatchDetailClient } from "@/components/matches/match-detail-client";

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Partida" };

export default async function MatchDetailPage({ params }: MatchPageProps) {
  const { id } = await params;
  return <MatchDetailClient matchId={id} />;
}
