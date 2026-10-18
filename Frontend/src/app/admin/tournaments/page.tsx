import type { Metadata } from "next";
import { AdminTournamentsClient } from "@/components/admin/admin-tournaments-client";

export const metadata: Metadata = { title: "Admin · Campeonatos" };

export default function AdminTournamentsPage() {
  return <AdminTournamentsClient />;
}
