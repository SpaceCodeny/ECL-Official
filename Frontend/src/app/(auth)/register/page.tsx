import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">
          Criar conta
        </h1>
        <p className="mt-2 text-sm text-muted">
          Junte-se à Elite Champions League
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
