"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface TeamMember {
  id: string;
  role: string;
  player: {
    id: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

interface TeamDetail {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  description: string | null;
  createdAt: string;
  memberships: TeamMember[];
}

export function TeamDetailClient({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => api.get<TeamDetail>(`/teams/${slug}`),
  });

  if (isLoading) return <LoadingState label="Carregando equipe…" className="min-h-[60vh]" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} className="min-h-[60vh]" />;

  const captain = data.memberships.find((m) => m.role === "CAPTAIN");
  const players = data.memberships.filter((m) => m.role !== "CAPTAIN");

  return (
    <div className="container-ecl py-10">
      <Link href="/teams" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-paper">
        <ArrowLeft className="h-4 w-4" />
        Todas as equipes
      </Link>

      <div className="card-ecl p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar name={data.name} src={data.logoUrl} size="lg" className="h-20 w-20 rounded-lg text-2xl" />
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-paper">{data.name}</h1>
            {data.tag && <Badge variant="gold">{data.tag}</Badge>}
            {data.description && <p className="text-sm text-muted">{data.description}</p>}
            <p className="text-xs text-muted/70">Criada em {formatDate(data.createdAt)}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-gold">
            <Users className="h-4 w-4" /> Elenco ({data.memberships.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {captain && (
              <MemberCard key={captain.id} member={captain} />
            )}
            {players.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const isCaptain = member.role === "CAPTAIN";
  return (
    <Link href={`/players/${member.player.user.username}`}
      className="card-ecl flex items-center gap-3 p-3 transition-colors hover:border-gold/40">
      <Avatar name={member.player.user.displayName} src={member.player.user.avatarUrl} size="md" />
      <div className="min-w-0">
        <p className="truncate font-display font-semibold uppercase tracking-tight text-paper">
          {member.player.user.displayName}
        </p>
        <p className="text-xs text-muted">@{member.player.user.username}</p>
      </div>
      {isCaptain && <Badge variant="gold" className="ml-auto shrink-0">Cap.</Badge>}
    </Link>
  );
}
