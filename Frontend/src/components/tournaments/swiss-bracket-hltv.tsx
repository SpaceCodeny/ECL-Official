"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  logoUrl: string | null;
}

interface SwissCampaign {
  id: string;
  teamId: string;
  team: TeamInfo;
  wins: number;
  losses: number;
  roundsPlayed: number;
  roundDiff: number;
  isEliminated: boolean;
  finalPosition?: number | null;
}

interface SwissMatch {
  id: string;
  teamAId: string;
  teamBId: string;
  teamA: TeamInfo;
  teamB: TeamInfo;
  winnerId: string | null;
  status: string;
  scoreA?: number | null;
  scoreB?: number | null;
}

interface SwissRound {
  id: string;
  roundNumber: number;
  isComplete: boolean;
  matches: SwissMatch[];
}

interface SwissBracketHTLVProps {
  rounds: SwissRound[];
  campaigns: SwissCampaign[];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function SwissBracketHLTV({ rounds, campaigns }: SwissBracketHTLVProps) {
  // teamId → campanha atual
  const campaignMap = useMemo(() => {
    const m = new Map<string, SwissCampaign>();
    campaigns.forEach((c) => m.set(c.teamId, c));
    return m;
  }, [campaigns]);

  // Histórico cronológico: para cada time, campanha W-L ANTES de cada partida
  const teamMatchHistory = useMemo(() => {
    type HistEntry = { match: SwissMatch; wBefore: number; lBefore: number };
    const hist = new Map<string, HistEntry[]>();
    campaigns.forEach((c) => hist.set(c.teamId, []));

    const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    for (const round of sorted) {
      for (const match of round.matches) {
        if (!hist.has(match.teamAId)) hist.set(match.teamAId, []);
        if (!hist.has(match.teamBId)) hist.set(match.teamBId, []);

        const hA = hist.get(match.teamAId)!;
        const hB = hist.get(match.teamBId)!;

        const wA = hA.filter((e) => e.match.winnerId === match.teamAId).length;
        const lA = hA.filter((e) => e.match.winnerId !== null && e.match.winnerId !== match.teamAId).length;
        const wB = hB.filter((e) => e.match.winnerId === match.teamBId).length;
        const lB = hB.filter((e) => e.match.winnerId !== null && e.match.winnerId !== match.teamBId).length;

        hA.push({ match, wBefore: wA, lBefore: lA });
        hB.push({ match, wBefore: wB, lBefore: lB });
      }
    }
    return hist;
  }, [rounds, campaigns]);

  // Grupos de campanha POR RODADA derivados dos dados reais das partidas
  // Isso evita qualquer divergência entre o mapa estático e os resultados reais
  const campaignGroupsByRound = useMemo(() => {
    const result = new Map<number, string[]>();

    rounds.forEach((round) => {
      const groups = new Set<string>();

      round.matches.forEach((match) => {
        const hA = teamMatchHistory.get(match.teamAId) ?? [];
        const entry = hA.find((e) => e.match.id === match.id);

        let wA: number, lA: number;
        if (entry) {
          wA = entry.wBefore;
          lA = entry.lBefore;
        } else {
          const cam = campaignMap.get(match.teamAId);
          wA = cam?.wins ?? 0;
          lA = cam?.losses ?? 0;
          if (match.status === "COMPLETED" && match.winnerId) {
            if (match.winnerId === match.teamAId) wA = Math.max(0, wA - 1);
            else lA = Math.max(0, lA - 1);
          }
        }

        groups.add(`${wA}-${lA}`);
      });

      // Ordenar grupos: mais vitórias primeiro, depois menos derrotas
      const sorted = [...groups].sort((a, b) => {
        const [wa, la] = a.split("-").map(Number);
        const [wb, lb] = b.split("-").map(Number);
        return (wb! - wa!) || (la! - lb!);
      });

      result.set(round.roundNumber, sorted);
    });

    return result;
  }, [rounds, teamMatchHistory, campaignMap]);

  // Agrupa partidas de uma rodada pela campanha que os times tinham ANTES da partida
  const getMatchesByCampaign = (roundNumber: number): Map<string, SwissMatch[]> => {
    const round = rounds.find((r) => r.roundNumber === roundNumber);
    if (!round) return new Map();

    const grouped = new Map<string, SwissMatch[]>();
    for (const match of round.matches) {
      const hA = teamMatchHistory.get(match.teamAId) ?? [];
      const entry = hA.find((e) => e.match.id === match.id);

      let wA: number, lA: number;
      if (entry) {
        wA = entry.wBefore;
        lA = entry.lBefore;
      } else {
        const cam = campaignMap.get(match.teamAId);
        wA = cam?.wins ?? 0;
        lA = cam?.losses ?? 0;
        if (match.status === "COMPLETED" && match.winnerId) {
          if (match.winnerId === match.teamAId) wA = Math.max(0, wA - 1);
          else lA = Math.max(0, lA - 1);
        }
      }

      const key = `${wA}-${lA}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(match);
    }

    return grouped;
  };

  const getCampaignColor = (c: string) => {
    const [w, l] = c.split("-").map(Number);
    if (w! > l!) return "bg-green-500/20 text-green-400 border-green-500";
    if (l! > w!) return "bg-red-500/20 text-red-400 border-red-600";
    return "bg-gray-700 text-gray-200 border-gray-500";
  };

  // Times classificados (3+ wins) e eliminados (3+ losses)
  const classifiedIds = useMemo(
    () => new Set(campaigns.filter((c) => c.wins >= 3).map((c) => c.teamId)),
    [campaigns]
  );
  const eliminatedIds = useMemo(
    () => new Set(campaigns.filter((c) => c.losses >= 3).map((c) => c.teamId)),
    [campaigns]
  );

  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-[#FF6B00] via-purple-600 to-[#FF6B00] p-6 rounded-t-lg text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-wider mb-1">
          FASE SUÍÇA — {campaigns.length} EQUIPES
        </h2>
        <p className="text-sm opacity-80">
          Sistema de Pareamento por Campanha • 12 Classificados
        </p>
      </div>

      <div className="bg-gray-900 p-8 rounded-b-lg overflow-x-auto">
        <div className="flex gap-10 min-w-max items-start">
          {rounds
            .slice()
            .sort((a, b) => a.roundNumber - b.roundNumber)
            .map((round) => (
              <RoundColumn
                key={round.roundNumber}
                roundNumber={round.roundNumber}
                groups={campaignGroupsByRound.get(round.roundNumber) ?? []}
                matchesByCampaign={getMatchesByCampaign(round.roundNumber)}
                campaignMap={campaignMap}
                classifiedIds={classifiedIds}
                eliminatedIds={eliminatedIds}
                getCampaignColor={getCampaignColor}
              />
            ))}
          <ClassifiedColumn campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}

// ─── Coluna de rodada ─────────────────────────────────────────────────────────

function RoundColumn({
  roundNumber,
  groups,
  matchesByCampaign,
  campaignMap,
  classifiedIds,
  eliminatedIds,
  getCampaignColor,
}: {
  roundNumber: number;
  groups: string[];
  matchesByCampaign: Map<string, SwissMatch[]>;
  campaignMap: Map<string, SwissCampaign>;
  classifiedIds: Set<string>;
  eliminatedIds: Set<string>;
  getCampaignColor: (c: string) => string;
}) {
  return (
    <div className="flex flex-col gap-5 min-w-[160px]">
      {groups.map((campaign) => {
        const [wN, lN] = campaign.split("-").map(Number);
        const matches = matchesByCampaign.get(campaign) ?? [];

        // Times atualmente nessa campanha que NÃO têm partida nesta rodada
        // E que NÃO estão classificados nem eliminados
        const paired = new Set(matches.flatMap((m) => [m.teamAId, m.teamBId]));
        const awaiting = [...campaignMap.values()].filter((c) =>
          c.wins === wN &&
          c.losses === lN &&
          !paired.has(c.teamId) &&
          !classifiedIds.has(c.teamId) &&   // nunca mostrar classificado como aguardando
          !eliminatedIds.has(c.teamId)       // nunca mostrar eliminado como aguardando
        );

        return (
          <div key={campaign} className="space-y-2">
            <div
              className={cn(
                "text-center py-1 px-3 rounded-md font-bold text-xs border",
                getCampaignColor(campaign)
              )}
            >
              {campaign}
            </div>

            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}

            {awaiting.map((c) => (
              <AwaitingCard key={c.teamId} team={c.team} />
            ))}

            {matches.length === 0 && awaiting.length === 0 && <EmptySlot />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Card de partida ──────────────────────────────────────────────────────────

function MatchCard({ match }: { match: SwissMatch }) {
  const done = match.status === "COMPLETED";
  const aWon = match.winnerId === match.teamAId;
  const bWon = match.winnerId === match.teamBId;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <TeamCircle team={match.teamA} won={done ? aWon : null} />
        <span className="text-[10px] font-bold text-gray-500 shrink-0">VS</span>
        <TeamCircle team={match.teamB} won={done ? bWon : null} />
      </div>
    </div>
  );
}

// ─── Círculo de time ──────────────────────────────────────────────────────────

function TeamCircle({ team, won }: { team: TeamInfo; won: boolean | null }) {
  return (
    <div
      className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center border-[3px] shrink-0",
        won === true
          ? "border-green-500 bg-green-500/15"
          : won === false
          ? "border-red-500 bg-red-500/15"
          : "border-gray-600 bg-gray-700"
      )}
    >
      <Avatar name={team.name} src={team.logoUrl} size="sm" className="w-8 h-8" />
    </div>
  );
}

// ─── Time aguardando adversário (rodada em andamento) ─────────────────────────

function AwaitingCard({ team }: { team: TeamInfo }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <TeamCircle team={team} won={null} />
        <span className="text-[10px] font-bold text-gray-500 shrink-0">VS</span>
        <div className="w-11 h-11 rounded-full flex items-center justify-center border-[3px] border-dashed border-gray-600 bg-gray-800 shrink-0">
          <span className="text-xl font-bold text-gray-500">?</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slot vazio (grupo sem partidas e sem times aguardando) ───────────────────

function EmptySlot() {
  return (
    <div className="bg-gray-800/40 border border-dashed border-gray-700/50 rounded-lg p-2.5 opacity-30">
      <div className="flex items-center gap-2">
        <div className="w-11 h-11 rounded-full border-[3px] border-dashed border-gray-600 bg-gray-800" />
        <span className="text-[10px] text-gray-700">—</span>
        <div className="w-11 h-11 rounded-full border-[3px] border-dashed border-gray-600 bg-gray-800" />
      </div>
    </div>
  );
}

// ─── Coluna de classificados / eliminados ─────────────────────────────────────

function ClassifiedColumn({ campaigns }: { campaigns: SwissCampaign[] }) {
  // Classificados por resultado: wins >= 3
  const classified = campaigns
    .filter((c) => c.wins >= 3)
    .sort((a, b) => a.losses - b.losses || b.roundDiff - a.roundDiff);

  // Classificados por ranking (finalPosition <= 12, mas sem 3 wins)
  const classifiedByRanking = campaigns
    .filter((c) => c.wins < 3 && c.losses < 3 && c.finalPosition != null && c.finalPosition <= 12)
    .sort((a, b) => (a.finalPosition ?? 99) - (b.finalPosition ?? 99));

  // Eliminados por resultado: losses >= 3
  const eliminated = campaigns
    .filter((c) => c.losses >= 3)
    .sort((a, b) => b.wins - a.wins || b.roundDiff - a.roundDiff);

  // Eliminados por ranking (finalPosition > 12, mas sem 3 losses)
  const eliminatedByRanking = campaigns
    .filter((c) => c.wins < 3 && c.losses < 3 && c.finalPosition != null && c.finalPosition > 12)
    .sort((a, b) => (a.finalPosition ?? 99) - (b.finalPosition ?? 99));

  // Agrupa por W-L, ordena melhor campanha primeiro
  const groupBy = (list: SwissCampaign[]) => {
    const map = new Map<string, SwissCampaign[]>();
    list.forEach((c) => {
      const k = `${c.wins}-${c.losses}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    });
    return [...map.entries()].sort(([a], [b]) => {
      const [wa, la] = a.split("-").map(Number);
      const [wb, lb] = b.split("-").map(Number);
      return (wb! - wa!) || (la! - lb!);
    });
  };

  const TeamBadge = ({
    c,
    variant,
    label,
  }: {
    c: SwissCampaign;
    variant: "green" | "red";
    label?: string;
  }) => (
    <div
      className={cn(
        "rounded-lg p-2 flex flex-col items-center justify-center border gap-1",
        variant === "green"
          ? "bg-green-500/10 border-green-600"
          : "bg-red-500/10 border-red-700"
      )}
    >
      <Avatar name={c.team.name} src={c.team.logoUrl} size="sm" className="w-9 h-9" />
      {label && (
        <span className={cn(
          "text-[8px] font-bold uppercase tracking-wide",
          variant === "green" ? "text-green-400" : "text-red-400"
        )}>
          {label}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 min-w-[80px]">
      {/* Classificados por resultado: 3-0, 3-1, 3-2 */}
      {groupBy(classified).map(([label, teams]) => (
        <div key={`c-${label}`} className="space-y-1.5">
          <div className="text-center py-1 px-2 rounded-md font-bold text-xs border bg-green-600 text-white border-green-500">
            {label}
          </div>
          {teams.map((c) => (
            <TeamBadge key={c.id} c={c} variant="green" />
          ))}
        </div>
      ))}

      {/* Classificados por ranking (fase sem 3W/3L) */}
      {classifiedByRanking.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-center py-1 px-2 rounded-md font-bold text-xs border bg-green-800 text-green-300 border-green-700">
            RANK
          </div>
          {classifiedByRanking.map((c) => (
            <TeamBadge key={c.id} c={c} variant="green" label={`${c.wins}-${c.losses}`} />
          ))}
        </div>
      )}

      {/* Eliminados por resultado: 0-3, 1-3, 2-3 */}
      {groupBy(eliminated).map(([label, teams]) => (
        <div key={`e-${label}`} className="space-y-1.5">
          <div className="text-center py-1 px-2 rounded-md font-bold text-xs border bg-red-700 text-white border-red-600">
            {label}
          </div>
          {teams.map((c) => (
            <TeamBadge key={c.id} c={c} variant="red" />
          ))}
        </div>
      ))}

      {/* Eliminados por ranking */}
      {eliminatedByRanking.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-center py-1 px-2 rounded-md font-bold text-xs border bg-red-900 text-red-400 border-red-800">
            RANK
          </div>
          {eliminatedByRanking.map((c) => (
            <TeamBadge key={c.id} c={c} variant="red" label={`${c.wins}-${c.losses}`} />
          ))}
        </div>
      )}
    </div>
  );
}
