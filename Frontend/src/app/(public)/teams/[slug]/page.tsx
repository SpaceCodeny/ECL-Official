import type { Metadata } from "next";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Equipe: ${slug}` };
}

export default async function TeamDetailPage({ params }: TeamPageProps) {
  const { slug } = await params;
  return <TeamDetailClient slug={slug} />;
}
