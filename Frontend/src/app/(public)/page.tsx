import type { Metadata } from "next";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturedTournamentSection } from "@/components/home/featured-tournament-section";
import { TournamentsSection } from "@/components/home/tournaments-section";
import { StatsSection } from "@/components/home/stats-section";
import { RankingSection } from "@/components/home/ranking-section";
import { AnnouncementsSection } from "@/components/home/announcements-section";

export const metadata: Metadata = {
  title: "Elite Champions League — The Road to Glory",
  description:
    "Plataforma oficial de torneios competitivos de Standoff 2. Campeonatos, equipes, partidas e rankings da Elite Champions League.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedTournamentSection />
      <TournamentsSection />
      {/* <StatsSection /> */}
      <RankingSection />
      <AnnouncementsSection />
    </>
  );
}
