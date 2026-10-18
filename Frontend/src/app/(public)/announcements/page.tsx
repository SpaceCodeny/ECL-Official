import type { Metadata } from "next";
import { AnnouncementsClient } from "@/components/home/announcements-client";

export const metadata: Metadata = { title: "Comunicados" };

export default function AnnouncementsPage() {
  return (
    <div className="container-ecl py-12">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-tight text-paper">
        Comunicados
      </h1>
      <AnnouncementsClient />
    </div>
  );
}
