"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { registerSchema, type RegisterFormData } from "@/validators/auth.validator";

export function RegisterForm() {
  const { register: registerUser, status, error, clearError } = useAuthStore();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const isLoading = status === "loading";

  async function onSubmit(data: RegisterFormData) {
    clearError();
    try {
      const { confirmPassword: _cp, ...dto } = data;
      const result = await registerUser(dto);
      setSuccessMsg(result.message);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      // Erro no store.
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
      noValidate
      aria-label="Formulário de cadastro"
    >
      <Input
        {...register("displayName")}
        label="Nome de exibição"
        placeholder="Seu nome na plataforma"
        autoComplete="name"
        error={errors.displayName?.message}
        disabled={isLoading}
      />

      <Input
        {...register("username")}
        label="Nome de usuário"
        placeholder="player123"
        autoComplete="username"
        error={errors.username?.message}
        disabled={isLoading}
      />

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
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
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

      <Input
        {...register("confirmPassword")}
        type="password"
        label="Confirmar senha"
        placeholder="Repita a senha"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        disabled={isLoading}
      />

      {error ? (
        <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={isLoading} className="mt-2 w-full">
        {isLoading ? (
          "Criando conta…"
        ) : (
          <>
            <UserPlus className="h-4 w-4" aria-hidden />
            Criar conta
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-gold hover:text-gold-light">
          Entrar
        </Link>
      </p>
    </form>
  );
}
