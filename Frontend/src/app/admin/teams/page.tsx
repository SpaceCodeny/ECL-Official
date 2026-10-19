import type { Metadata } from "next";
import { AdminTeamsClient } from "@/components/admin/admin-teams-client";

export const metadata: Metadata = { title: "Admin · Equipes" };

export default function AdminTeamsPage() {
  return <AdminTeamsClient />;
}
