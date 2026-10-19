import type { Metadata } from "next";
import { AdminPlayersClient } from "@/components/admin/admin-players-client";

export const metadata: Metadata = { title: "Admin · Jogadores" };

export default function AdminPlayersPage() {
  return <AdminPlayersClient />;
}
