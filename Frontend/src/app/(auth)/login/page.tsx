import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
          Bem-vindo de volta
        </h1>
        <p className="mt-2 text-sm text-muted">
          Entre na sua conta Elite Champions League
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-8">
        <LoginForm />
      </div>
    </div>
  );
}
