"use client";

import { cn } from "@/lib/utils";

// Mapas do Standoff 2 com caminhos das imagens
export const STANDOFF_MAPS = [
  { name: "Sandstone", image: "/images/maps/sandstone.png" },
  { name: "Province",  image: "/images/maps/province.png" },
  { name: "Rust",      image: "/images/maps/rust.png" },
  { name: "Hanami",    image: "/images/maps/hanami.png" },
  { name: "Breeze",    image: "/images/maps/breeze.png" },
  { name: "Dune",      image: "/images/maps/dune.png" },
  { name: "Prison",    image: "/images/maps/prision.png" },
  { name: "Sakura",    image: "/images/maps/sakura.png" },
] as const;

export type MapName = typeof STANDOFF_MAPS[number]["name"];

export interface MapEntry {
  id: string;
  mapName: string;
  order: number;
  action?: string | null;       // PICKED | BANNED | DECIDER | null
  actionTeamId?: string | null;
  scoreA?: number | null;       // rounds do Time A neste mapa (0–13)
  scoreB?: number | null;       // rounds do Time B neste mapa (0–13)
  winnerId?: string | null;     // id do time vencedor deste mapa
  played?: boolean;
}

export function getMapImage(name: string): string {
  const found = STANDOFF_MAPS.find((m) => m.name.toLowerCase() === name.toLowerCase());
  return found?.image ?? "/images/maps/sandstone.png";
}

// ─── Card individual de mapa ──────────────────────────────────────────────────

function MapCard({
  entry,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
  isCurrentlyPlaying = false,
  deciderUnused = false,
}: {
  entry: MapEntry;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  isCurrentlyPlaying?: boolean;
  deciderUnused?: boolean;
}) {
  const isBanned  = entry.action === "BANNED";
  const isPicked  = entry.action === "PICKED";
  const isDecider = entry.action === "DECIDER";
  const noAction  = !entry.action;

  // Time que baniu ou fez pick (decider não tem time)
  const actionTeamName = !isDecider && entry.actionTeamId
    ? (entry.actionTeamId === teamAId ? teamAName : teamBName)
    : null;

  // Placar do mapa (rounds): quem chegou a 13 ganhou
  const hasMapScore = entry.scoreA !== null && entry.scoreB !== null && entry.scoreA !== undefined && entry.scoreB !== undefined;
  const wonA = hasMapScore && (entry.scoreA! >= entry.scoreB!);  // A ganhou se fez mais rounds
  const wonB = hasMapScore && (entry.scoreB! > entry.scoreA!);   // B ganhou se fez mais rounds

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border transition-all",
      isBanned       && "opacity-60",
      isPicked       && "border-emerald-500/40",
      isDecider      && !deciderUnused && "border-gold/40",
      isDecider      && deciderUnused && "border-border/30 opacity-40 grayscale",
      noAction       && "border-border/60",
      isCurrentlyPlaying && "border-red-500/60 shadow-lg shadow-red-500/10",
      !isBanned && !isPicked && !isDecider && !noAction && "border-border/60",
    )}>
      {/* Imagem de fundo */}
      <div className="relative h-28 w-full sm:h-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getMapImage(entry.mapName)}
          alt={entry.mapName}
          className={cn(
            "h-full w-full object-cover",
            isBanned && "brightness-40 grayscale",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Badge AO VIVO */}
        {isCurrentlyPlaying && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            LIVE
          </div>
        )}

        {/* Badge de ação */}
        {isBanned && (
          <div className="absolute right-2 top-2 rounded bg-red-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300">
            BAN
          </div>
        )}
        {isPicked && (
          <div className="absolute right-2 top-2 rounded bg-emerald-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
            PICK
          </div>
        )}
        {isDecider && (
          <div className="absolute right-2 top-2 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            DECIDER
          </div>
        )}

        {/* Nome do mapa + time que baniu/escolheu */}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-white drop-shadow-sm sm:text-sm">
            {entry.mapName}
          </p>
          {actionTeamName && (
            <p className={cn(
              "text-[9px] font-medium",
              isBanned ? "text-red-300/80" : "text-emerald-300/80",
            )}>
              {isBanned ? "Ban: " : "Pick: "}{actionTeamName}
            </p>
          )}
          {isDecider && (
            <p className="text-[9px] font-bold uppercase tracking-wide text-blue-400">DECIDER</p>
          )}
        </div>
      </div>

      {/* Placar do mapa em rounds (0–13) */}
      {hasMapScore && !isBanned && (
        <div className="flex items-stretch bg-ink/80">
          {/* Score Time A */}
          <div className={cn(
            "flex flex-1 items-center justify-center py-2",
            wonA ? "bg-emerald-500/15" : "bg-red-500/10",
          )}>
            <span className={cn(
              "font-display text-lg font-bold tabular-nums leading-none",
              wonA ? "text-emerald-400" : "text-red-400",
            )}>
              {entry.scoreA}
            </span>
          </div>

          {/* Separador */}
          <div className="flex items-center px-1.5">
            <span className="text-xs text-muted/60">:</span>
          </div>

          {/* Score Time B */}
          <div className={cn(
            "flex flex-1 items-center justify-center py-2",
            wonB ? "bg-emerald-500/15" : "bg-red-500/10",
          )}>
            <span className={cn(
              "font-display text-lg font-bold tabular-nums leading-none",
              wonB ? "text-emerald-400" : "text-red-400",
            )}>
              {entry.scoreB}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal do Map Pool ────────────────────────────────────────

export function MapPool({
  maps,
  seriesFormat,
  matchStatus,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
  currentScoreA,
  currentScoreB,
}: {
  maps: MapEntry[];
  seriesFormat: string;
  matchStatus: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  currentScoreA?: number | null;
  currentScoreB?: number | null;
}) {
  const isLive = matchStatus === "LIVE" || matchStatus === "AWAITING_RESULT";
  const isCompleted = matchStatus === "COMPLETED";

  // Série decidida? DECIDER não será jogado
  const maxToWin = seriesFormat === "BO1" ? 1 : seriesFormat === "BO3" ? 2 : 3;
  const serieDecided =
    (currentScoreA ?? 0) >= maxToWin || (currentScoreB ?? 0) >= maxToWin;

  // Mapas que são jogados (picks + decider) em ordem
  const playableMaps = maps
    .filter((m) => m.action === "PICKED" || m.action === "DECIDER")
    .sort((a, b) => a.order - b.order);

  // Mapa atual ao vivo: primeiro pick/decider sem score de rounds finalizado
  const currentMap = isLive
    ? playableMaps.find((m) => m.scoreA === null || m.scoreB === null || !m.played)
    : null;

  // Placar de rounds do mapa atual (para exibir no banner AO VIVO)
  const currentMapScoreA = currentMap?.scoreA ?? 0;
  const currentMapScoreB = currentMap?.scoreB ?? 0;

  const hasDefinedMaps = maps.length > 0;

  return (
    <div className="space-y-5">

      {/* ── Banner AO VIVO ──────────────────────────────────────────── */}
      {isLive && currentMap && (
        <div className="relative overflow-hidden rounded-xl border border-red-500/40">
          {/* Foto do mapa como bg */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMapImage(currentMap.mapName)}
              alt={currentMap.mapName}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70" />
          </div>

          <div className="relative z-10 px-4 py-5 text-center sm:px-6 sm:py-6">
            {/* Tag AO VIVO */}
            <div className="mb-2 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                AO VIVO
              </span>
            </div>

            {/* Nome do mapa */}
            <p className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
              {currentMap.mapName}
            </p>

            {/* Placar de ROUNDS do mapa atual */}
            <div className="flex items-center justify-center gap-3">
              <span className="min-w-0 flex-1 truncate text-right font-display text-sm font-bold uppercase text-white/80 sm:text-base">
                {teamAName}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="font-display text-3xl font-bold tabular-nums text-white sm:text-4xl">
                  {currentMapScoreA}
                </span>
                <span className="mx-1 font-display text-xl text-white/40">:</span>
                <span className="font-display text-3xl font-bold tabular-nums text-white sm:text-4xl">
                  {currentMapScoreB}
                </span>
              </div>
              <span className="min-w-0 flex-1 truncate text-left font-display text-sm font-bold uppercase text-white/80 sm:text-base">
                {teamBName}
              </span>
            </div>

            {/* Placar agregado abaixo (menor) */}
            {(currentScoreA !== null && currentScoreA !== undefined) && (
              <p className="mt-3 text-[11px] text-white/50 uppercase tracking-widest">
                Série: {currentScoreA} × {currentScoreB} ({seriesFormat})
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Grid de mapas (picks, bans, decider) ───────────────────── */}
      {!hasDefinedMaps ? (
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-widest text-muted">
            Mapas não definidos ainda
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STANDOFF_MAPS.map((map) => (
              <MapCard
                key={map.name}
                entry={{ id: map.name, mapName: map.name, order: 0 }}
                teamAId={teamAId}
                teamBId={teamBId}
                teamAName={teamAName}
                teamBName={teamBName}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-widest text-muted">
            {seriesFormat} · Map Pool
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...maps]
              .sort((a, b) => a.order - b.order)
              .map((entry) => (
                <MapCard
                  key={entry.id}
                  entry={entry}
                  teamAId={teamAId}
                  teamBId={teamBId}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  isCurrentlyPlaying={isLive && entry.id === currentMap?.id}
                  deciderUnused={serieDecided && entry.action === "DECIDER" && !entry.played}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
