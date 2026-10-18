import type { Metadata } from "next";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

export const metadata: Metadata = { title: "Admin · Usuários" };

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
