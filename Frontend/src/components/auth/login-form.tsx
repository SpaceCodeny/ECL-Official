"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema, type LoginFormData } from "@/validators/auth.validator";
import { FetchError } from "@/lib/api-client";

export function LoginForm() {
  const { login, status, error, clearError } = useAuthStore();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const isLoading = status === "loading";

  async function onSubmit(data: LoginFormData) {
    clearError();
    try {
      await login(data);
      router.push("/dashboard");
      router.refresh();
    } catch {
      // Erro já está no store via `error`.
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-5"
      noValidate
      aria-label="Formulário de login"
    >
      <Input
        {...register("email")}
        type="email"
        label="E-mail"
        placeholder="seu@email.com"
        autoComplete="email"
        error={errors.email?.message}
        disabled={isLoading}
      />

      <div className="relative">
        <Input
          {...register("password")}
          type={showPassword ? "text" : "password"}
          label="Senha"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          disabled={isLoading}
        />
        <button
          type="button"
          className="absolute bottom-0 right-3 top-7 flex items-center justify-center text-muted hover:text-paper"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          "Entrando…"
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden />
            Entrar
          </>
        )}
      </Button>

      <div className="text-center">
        <Link href="/forgot-password" className="text-sm text-muted hover:text-gold">
          Esqueceu a senha?
        </Link>
      </div>

      <p className="text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link href="/register" className="font-medium text-gold hover:text-gold-light">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
