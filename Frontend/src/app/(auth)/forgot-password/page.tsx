import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
          Recuperar senha
        </h1>
      </div>
      <div className="rounded-lg border border-border bg-surface p-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
