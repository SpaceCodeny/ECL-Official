import type { Metadata } from "next";
import { RankingsClient } from "@/components/standings/rankings-client";

export const metadata: Metadata = { title: "Ranking" };

export default function RankingsPage() {
  return <RankingsClient />;
}
