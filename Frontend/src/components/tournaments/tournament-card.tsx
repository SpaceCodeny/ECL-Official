import Link from "next/link";
import { Calendar, Users, Trophy, ArrowRight, Lock } from "lucide-react";
import { TournamentStatusBadge } from "./status-badge";
import { tournamentFormatLabel } from "@/lib/labels";
import { formatDate, cn } from "@/lib/utils";
import type { TournamentListItem } from "@/types/tournament";

export function TournamentCard({ tournament: t }: { tournament: TournamentListItem }) {
  const spotsLeft = Math.max(t.maxTeams - t.registeredTeams, 0);
  const fillPct = Math.min((t.registeredTeams / t.maxTeams) * 100, 100);
  const almostFull = fillPct >= 80;
  const isFull = fillPct >= 100;
  const isOpen = t.status === "REGISTRATION_OPEN";
  const isLive = t.status === "IN_PROGRESS";

  return (
    <Link href={`/tournaments/${t.slug}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-2xl">
      <article
        className={cn(
          "relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300",
          "bg-surface/60 backdrop-blur-sm",
          isLive
            ? "border-red-500/40 hover:border-red-400/60 hover:shadow-lg hover:shadow-red-900/30"
            : "border-border/60 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10",
        )}
      >
        {/* Banner / Placeholder */}
        <div className="relative h-28 overflow-hidden bg-navy/80">
          {t.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.bannerUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            /* Placeholder geométrico premium */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-navy/80 via-ink/90 to-black" />
              {/* Grid de linhas decorativas */}
              <svg className="absolute inset-0 h-full w-full opacity-10" aria-hidden>
                <defs>
                  <pattern id={`grid-${t.id}`} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gold" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${t.id})`} />
              </svg>
              <Trophy className="relative h-10 w-10 text-gold/20" />
            </div>
          )}

          {/* Gradiente de fade para o card body */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface/90 to-transparent" />

          {/* Badge de status + formato */}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <TournamentStatusBadge status={t.status} />
          </div>
          <div className="absolute right-3 top-3">
            <span className="rounded-full border border-border/60 bg-ink/70 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-muted backdrop-blur-sm">
              {tournamentFormatLabel[t.format]}
            </span>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex flex-1 flex-col gap-4 p-5">
          {/* Título */}
          <div>
            <h3
              className={cn(
                "font-display text-base font-bold uppercase leading-tight tracking-tight transition-colors duration-200",
                isLive ? "text-paper group-hover:text-red-400" : "text-paper group-hover:text-gold",
              )}
            >
              {t.name}
            </h3>
            <p className="mt-0.5 text-xs uppercase tracking-widest text-gold/70">{t.season}</p>
          </div>

          {/* Informações */}
          <div className="space-y-2 text-xs text-muted sm:text-xs">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-gold/50" aria-hidden />
              {t.startDate ? formatDate(t.startDate) : "Data a definir"}
            </span>

            {t.prizePool && (
              <span className="flex items-center gap-2 text-gold">
                <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                {t.prizePool}
              </span>
            )}
          </div>

          {/* Barra de vagas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <Users className="h-4 w-4" aria-hidden />
                {t.registeredTeams}/{t.maxTeams} equipes
              </span>
              {isOpen && !isFull && (
                <span className={cn("font-medium", almostFull ? "text-amber-400" : "text-muted")}>
                  {spotsLeft} {spotsLeft === 1 ? "vaga" : "vagas"}
                </span>
              )}
              {isFull && isOpen && (
                <span className="font-medium text-red-400">Esgotado</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isFull
                    ? "bg-red-500"
                    : almostFull
                      ? "bg-amber-400"
                      : "bg-gradient-to-r from-gold-dark to-gold",
                )}
                style={{ width: `${fillPct}%` }}
                role="progressbar"
                aria-valuenow={t.registeredTeams}
                aria-valuemin={0}
                aria-valuemax={t.maxTeams}
                aria-label="Vagas preenchidas"
              />
            </div>
          </div>

          {/* CTA */}
          <div
            className={cn(
              "mt-auto flex items-center justify-between text-xs font-medium transition-all duration-200 sm:text-xs",
              isOpen && !isFull
                ? "text-gold"
                : isLive
                  ? "text-red-400"
                  : "text-muted",
            )}
          >
            <span>
              {isOpen && !isFull && "Inscrições abertas"}
              {isOpen && isFull && (
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> Vagas esgotadas
                </span>
              )}
              {isLive && "Em andamento"}
              {t.status === "REGISTRATION_CLOSED" && "Inscrições encerradas"}
              {t.status === "COMPLETED" && "Encerrado"}
              {t.status === "PUBLISHED" && "Em breve"}
              {t.status === "DRAFT" && "Rascunho"}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </div>
        </div>

        {/* Glow bottom para torneio ao vivo */}
        {isLive && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
        )}
        {/* Glow bottom gold para inscrições abertas */}
        {isOpen && !isFull && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        )}
      </article>
    </Link>
  );
}
