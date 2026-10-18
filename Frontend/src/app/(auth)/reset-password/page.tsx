import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Redefinir senha" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-lg border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm text-red-400">Link inválido ou expirado. Solicite um novo link de recuperação.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
          Nova senha
        </h1>
        <p className="mt-2 text-sm text-muted">Crie uma nova senha segura para sua conta.</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-8">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
