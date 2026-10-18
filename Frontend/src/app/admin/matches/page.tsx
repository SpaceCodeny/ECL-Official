import type { Metadata } from "next";
import { AdminMatchesClient } from "@/components/admin/admin-matches-client";

export const metadata: Metadata = { title: "Admin · Partidas" };

export default function AdminMatchesPage() {
  return <AdminMatchesClient />;
}
