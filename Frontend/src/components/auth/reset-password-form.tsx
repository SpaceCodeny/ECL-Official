"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { FetchError } from "@/lib/api-client";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/validators/auth.validator";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(data: ResetPasswordFormData) {
    setIsLoading(true);
    setApiError(null);
    try {
      const result = await authService.resetPassword(token, data.password);
      setSuccessMsg(result.message);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e) {
      setApiError(e instanceof FetchError ? e.message : "Erro inesperado");
    } finally {
      setIsLoading(false);
    }
  }

  if (successMsg) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-sm text-emerald-400">{successMsg}</p>
        <p className="mt-2 text-xs text-muted">Redirecionando para o login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <Input
        {...register("password")}
        type="password"
        label="Nova senha"
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        error={errors.password?.message}
        disabled={isLoading}
      />
      <Input
        {...register("confirmPassword")}
        type="password"
        label="Confirmar nova senha"
        placeholder="Repita a senha"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        disabled={isLoading}
      />

      {apiError ? (
        <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? "Salvando…" : (
          <>
            <KeyRound className="h-4 w-4" aria-hidden />
            Redefinir senha
          </>
        )}
      </Button>
    </form>
  );
}
