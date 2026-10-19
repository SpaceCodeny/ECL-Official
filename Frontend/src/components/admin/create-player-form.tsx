"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { playersService } from "@/services/players.service";

const schema = z.object({
  displayName: z.string().min(2, "Mínimo 2 caracteres").max(60),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e underscore"),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Ao menos um número"),
  standoffId: z.string().optional(),
  bio: z.string().max(300).optional(),
  country: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { onSuccess: () => void; onCancel: () => void; }

export function CreatePlayerForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (d: FormData) => playersService.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      onSuccess();
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      {/* Dados de conta */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">
        Conta de acesso
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          {...register("displayName")}
          label="Nome de exibição *"
          placeholder="João Silva"
          error={errors.displayName?.message}
        />
        <Input
          {...register("username")}
          label="Username *"
          placeholder="joaosilva"
          autoCapitalize="none"
          error={errors.username?.message}
        />
      </div>

      <Input
        {...register("email")}
        type="email"
        label="E-mail *"
        placeholder="joao@email.com"
        error={errors.email?.message}
      />

      <div className="relative">
        <Input
          {...register("password")}
          type={showPass ? "text" : "password"}
          label="Senha inicial *"
          placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
          error={errors.password?.message}
        />
        <button
          type="button"
          onClick={() => setShowPass((v) => !v)}
          className="absolute bottom-0 right-3 top-7 flex items-center text-muted hover:text-paper"
          aria-label={showPass ? "Ocultar" : "Mostrar"}
        >
          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Dados de perfil */}
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
          Perfil de jogador (opcional)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            {...register("standoffId")}
            label="ID no Standoff 2"
            placeholder="Ex: 1234567890"
          />
          <Input
            {...register("country")}
            label="País"
            placeholder="Brasil"
          />
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-paper">Bio</label>
          <textarea
            {...register("bio")}
            rows={2}
            placeholder="Breve descrição…"
            className="rounded-md border border-border bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>

      {mutation.isError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao criar jogador"}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando…" : "Criar jogador"}
        </Button>
      </div>
    </form>
  );
}
