import type { Metadata } from "next";
import { AdminAuditClient } from "@/components/admin/admin-audit-client";

export const metadata: Metadata = { title: "Admin · Auditoria" };

export default function AdminAuditPage() {
  return <AdminAuditClient />;
}
