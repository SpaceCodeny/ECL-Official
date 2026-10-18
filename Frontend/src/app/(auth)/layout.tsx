import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-12">
      <Link href="/" className="mb-8" aria-label="Elite Champions League — início">
        <Logo size="lg" />
      </Link>
      {children}
    </div>
  );
}
