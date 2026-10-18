import type { Metadata } from "next";
import { AdminRegistrationsClient } from "@/components/admin/admin-registrations-client";

export const metadata: Metadata = { title: "Admin · Inscrições" };

export default function AdminRegistrationsPage() {
  return <AdminRegistrationsClient />;
}
