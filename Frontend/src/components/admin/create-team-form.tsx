"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, X, Crown, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ImageUpload } from "@/components/ui/image-upload";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserOption {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  playerProfile: { id: string } | null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  tag: z
    .string()
    .max(6, "Máximo 6 caracteres")
    .regex(/^[A-Z0-9]*$/i, "Apenas letras e números")
    .optional()
    .or(z.literal("")),
  description: z.string().max(300).optional(),
  logoUrl: z.string().url().optional().nullable(),
  captainUserId: z.string().min(1, "Selecione o capitão da equipe"),
  memberUserIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CreateTeamForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { captainUserId: "", memberUserIds: [], logoUrl: null },
  });

  const captainUserId = watch("captainUserId");
  const memberUserIds = watch("memberUserIds");

  // ── Debounce da busca ──
  const handleSearch = useCallback((v: string) => {
    setUserSearch(v);
    clearTimeout((window as Window & { _ut?: ReturnType<typeof setTimeout> })._ut);
    (window as Window & { _ut?: ReturnType<typeof setTimeout> })._ut = setTimeout(
      () => setDebouncedSearch(v),
      350,
    );
  }, []);

  // ── Busca de usuários ──
  const { data: usersData, isFetching } = useQuery({
    queryKey: ["admin-users-for-team", debouncedSearch],
    queryFn: () =>
      api.get<{ data: UserOption[] }>("/admin/users", {
        search: debouncedSearch || undefined,
        pageSize: 30,
        status: "ACTIVE",
      }),
  });

  const users = usersData?.data ?? [];

  // ── Mutação de criação ──
  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post(
        "/teams/admin",
        {
          name: data.name,
          tag: data.tag || undefined,
          description: data.description || undefined,
          logoUrl: data.logoUrl || undefined,
          captainUserId: data.captainUserId,
          memberUserIds: data.memberUserIds,
        },
        true,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onSuccess();
    },
  });

  // ── Helpers de seleção ──
  function selectCaptain(userId: string) {
    setValue("captainUserId", userId);
    // Remove do array de membros se estiver lá
    setValue(
      "memberUserIds",
      memberUserIds.filter((id) => id !== userId),
    );
  }

  function toggleMember(userId: string) {
    if (userId === captainUserId) return; // capitão não pode ser membro duplo
    const current = memberUserIds;
    if (current.includes(userId)) {
      setValue("memberUserIds", current.filter((id) => id !== userId));
    } else {
      setValue("memberUserIds", [...current, userId]);
    }
  }

  function getUserById(id: string) {
    return users.find((u) => u.id === id);
  }

  // ── Usuários já selecionados (capitão + membros) ──
  const selectedIds = new Set([
    ...(captainUserId ? [captainUserId] : []),
    ...memberUserIds,
  ]);

  const captain = captainUserId ? getUserById(captainUserId) : null;

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="space-y-5"
    >
      {/* ── Dados da equipe ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            {...register("name")}
            label="Nome da equipe *"
            placeholder="Phantom Squad"
            error={errors.name?.message}
          />
        </div>
        <Input
          {...register("tag")}
          label="Tag (até 6 caracteres)"
          placeholder="PHN"
          className="uppercase"
          error={errors.tag?.message}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-paper">Descrição</label>
        <textarea
          {...register("description")}
          rows={2}
          placeholder="Breve descrição da equipe…"
          className="rounded-md border border-border bg-ink/50 px-3 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </div>

      {/* ── Upload da logo ── */}
      <Controller
        name="logoUrl"
        control={control}
        render={({ field }) => (
          <ImageUpload
            label="Logo da equipe"
            hint="PNG, JPG, WEBP ou SVG · Máx 5 MB · Recomendado: 256×256px"
            value={field.value ?? null}
            onChange={field.onChange}
          />
        )}
      />

      {/* ── Seleção exibida: capitão + membros já escolhidos ── */}
      {selectedIds.size > 0 && (
        <div className="rounded-lg border border-border bg-ink/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Composição da equipe ({selectedIds.size})
          </p>
          <div className="flex flex-wrap gap-2">
            {captain && (
              <SelectedUserChip
                user={captain}
                role="CAPTAIN"
                onRemove={() => setValue("captainUserId", "")}
              />
            )}
            {memberUserIds.map((id) => {
              const u = getUserById(id);
              if (!u) return null;
              return (
                <SelectedUserChip
                  key={id}
                  user={u}
                  role="PLAYER"
                  onRemove={() => toggleMember(id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {errors.captainUserId && (
        <p className="text-xs text-red-400">{errors.captainUserId.message}</p>
      )}

      {/* ── Busca e seleção de usuários ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-paper">
            Selecionar usuários *
          </p>
          <p className="text-xs text-muted">
            Clique em{" "}
            <Crown className="inline h-3 w-3 text-gold" /> para capitão,{" "}
            <UserPlus className="inline h-3 w-3 text-muted" /> para membro
          </p>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nome, usuário ou e-mail…"
            value={userSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-ink/50 pl-10 pr-4 text-sm text-paper placeholder:text-muted/60 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        {/* Lista de usuários */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
          {users.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Users className="h-4 w-4" />
              {debouncedSearch ? "Nenhum usuário encontrado" : "Carregando usuários…"}
            </div>
          ) : (
            users.map((user) => {
              const isCaptain = user.id === captainUserId;
              const isMember = memberUserIds.includes(user.id);
              const isSelected = isCaptain || isMember;

              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    isSelected ? "bg-gold/5" : "hover:bg-surfaceHover",
                  )}
                >
                  <Avatar
                    name={user.displayName}
                    src={user.avatarUrl}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-paper">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-muted">
                      @{user.username} · {user.email}
                    </p>
                  </div>

                  {/* Status de seleção */}
                  {isCaptain && (
                    <Badge variant="gold" className="shrink-0 text-[10px]">
                      Capitão
                    </Badge>
                  )}
                  {isMember && !isCaptain && (
                    <Badge variant="success" className="shrink-0 text-[10px]">
                      Membro
                    </Badge>
                  )}

                  {/* Botões de ação */}
                  <div className="flex shrink-0 items-center gap-1 ml-2">
                    {/* Capitão */}
                    <button
                      type="button"
                      title="Definir como capitão"
                      onClick={() => selectCaptain(user.id)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                        isCaptain
                          ? "border-gold/60 bg-gold/15 text-gold"
                          : "border-border text-muted hover:border-gold/40 hover:text-gold",
                      )}
                    >
                      <Crown className="h-3.5 w-3.5" />
                    </button>

                    {/* Membro */}
                    <button
                      type="button"
                      title={isMember ? "Remover membro" : "Adicionar como membro"}
                      onClick={() => toggleMember(user.id)}
                      disabled={isCaptain}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                        isMember && !isCaptain
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                          : "border-border text-muted hover:border-emerald-500/40 hover:text-emerald-400",
                        isCaptain && "cursor-not-allowed opacity-40",
                      )}
                    >
                      {isMember && !isCaptain ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Erro de API ── */}
      {mutation.isError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Erro ao criar equipe"}
        </p>
      )}

      {/* ── Ações ── */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando equipe…" : "Criar equipe"}
        </Button>
      </div>
    </form>
  );
}

// ─── Chip de usuário selecionado ──────────────────────────────────────────────

function SelectedUserChip({
  user,
  role,
  onRemove,
}: {
  user: UserOption;
  role: "CAPTAIN" | "PLAYER";
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
        role === "CAPTAIN"
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-border bg-surface text-muted",
      )}
    >
      <Avatar name={user.displayName} src={user.avatarUrl} size="sm" className="h-5 w-5 text-[9px]" />
      <span className="font-medium">{user.displayName}</span>
      {role === "CAPTAIN" && <Crown className="h-3 w-3" />}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full hover:text-paper transition-colors"
        aria-label={`Remover ${user.displayName}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
