import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { RegisterTeamForm } from "@/components/tournaments/register-team-form";
import { getTournamentBySlug } from "@/services/tournaments.service";
import { TournamentStatusBadge } from "@/components/tournaments/status-badge";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getTournamentBySlug(slug).catch(() => null);

  return {
    title: tournament
      ? `Inscrever Equipe - ${tournament.name} | ECL`
      : "Inscrever Equipe | ECL",
    description: tournament
      ? `Inscreva sua equipe no ${tournament.name} da Elite Champions League.`
      : "Inscreva sua equipe em um campeonato da ECL.",
  };
}

export default async function RegisterTeamPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournamentBySlug(slug).catch(() => null);

  if (!tournament) {
    notFound();
  }

  // Verificar se inscrições estão abertas
  if (tournament.status !== "REGISTRATION_OPEN") {
    return (
      <div className="container-ecl py-12">
        <div className="mx-auto max-w-2xl text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-paper">
            Inscrições Fechadas
          </h1>
          <p className="mt-3 text-muted">
            As inscrições para este campeonato não estão abertas no momento.
          </p>
          <Link
            href={`/tournaments/${slug}`}
            className="mt-6 inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao campeonato
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-ecl py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/tournaments/${slug}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-paper"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao campeonato
        </Link>

        <div className="space-y-2">
          <TournamentStatusBadge status={tournament.status} />
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-paper sm:text-3xl">
            Inscrever Equipe
          </h1>
          <p className="text-sm text-muted">
            {tournament.name} · {tournament.season}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="mb-8 rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-tight text-paper">
          Informações do Campeonato
        </h2>
        <div className="space-y-2 text-sm text-muted">
          <p>
            <strong className="text-paper">Vagas:</strong> {tournament.registeredTeams || 0}/{tournament.maxTeams}
          </p>
          {tournament.registrationDeadline && (
            <p>
              <strong className="text-paper">Prazo:</strong>{" "}
              {new Date(tournament.registrationDeadline).toLocaleDateString("pt-BR")}
            </p>
          )}
          {tournament.prizePool && (
            <p>
              <strong className="text-paper">Premiação:</strong> {tournament.prizePool}
            </p>
          )}
        </div>
      </div>

      {/* Formulário */}
      <div className="mx-auto max-w-4xl">
        <RegisterTeamForm tournamentId={tournament.id} tournamentSlug={slug} />
      </div>
    </div>
  );
}
