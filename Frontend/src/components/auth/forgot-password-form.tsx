"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { FetchError } from "@/lib/api-client";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/validators/auth.validator";

export function ForgotPasswordForm() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true);
    setApiError(null);
    try {
      const result = await authService.forgotPassword(data.email);
      setSuccessMsg(result.message);
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
        <p className="mt-2 text-xs text-muted">
          Se o e-mail estiver cadastrado, você receberá as instruções em breve.
        </p>
        <Link href="/login" className="mt-4 block text-sm font-medium text-gold hover:text-gold-light">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <p className="text-sm text-muted">
        Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
      </p>

      <Input
        {...register("email")}
        type="email"
        label="E-mail"
        placeholder="seu@email.com"
        autoComplete="email"
        error={errors.email?.message}
        disabled={isLoading}
      />

      {apiError ? (
        <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? "Enviando…" : (
          <>
            <Mail className="h-4 w-4" aria-hidden />
            Enviar instruções
          </>
        )}
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-muted hover:text-gold">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
