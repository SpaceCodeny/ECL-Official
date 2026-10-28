import { OfficialHeader } from "@/components/OfficialHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background-primary">
      <OfficialHeader />
      <main className="py-8">{children}</main>
    </div>
  );
}
