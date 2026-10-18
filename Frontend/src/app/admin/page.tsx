import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const metadata: Metadata = { title: "Admin · Dashboard" };

export default function AdminPage() {
  return <AdminDashboardClient />;
}
