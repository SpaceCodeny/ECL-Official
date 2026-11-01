"use client";

import {
  Swords,
  Shield,
  Trophy,
  Star,
  ChevronRight,
  GitBranch,
  Layers,
} from "lucide-react";
import { MatchCard } from "./match-card";
import type { Match, MatchStage } from "@/types/match";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStageMeta(stage: string | MatchStage) {
  if (typeof stage === "string") return { name: stage, type: null, order: 0 };
  return {
    name: stage.name ?? "",
    type: stage.type ?? null,
    order: stage.order ?? 0,
  };
}

/**
 * Traduz bracketPosition para rótulo legível em PT-BR.
 * Exemplos de bracketPosition: "RO16-1", "QF1", "SF1", "FINAL", "THIRD_PLACE"
 */
function bracketPositionToLabel(pos: string): string {
  const p = pos.toUpperCase();
  if (p.startsWith("RO16") || p.startsWith("R016")) return "Oitavas de Final";
  if (p.startsWith("QF")) return "Quartas de Final";
  if (p.startsWith("SF")) return "Semifinal";
  if (p.startsWith("THIRD") || p === "3RD" || p === "THIRD_PLACE") return "Disputa de 3º Lugar";
  if (p === "FINAL" || p.startsWith("FINAL")) return "Final";
  return pos;
}

/**
 * Mapeia stage.type + round para uma chave de grupo e seu rótulo.
 * Grupos ordenados: Swiss rounds por número → Playoff phases por ordem.
 */
interface GroupInfo {
  key: string;
  label: string;
  sublabel?: string;
  type: "swiss" | "bracket" | "other";
  sortOrder: number;
}

function getGroupInfo(match: Match): GroupInfo {
  const { type, name, order } = getStageMeta(match.stage);
  const bp = match.bracketPosition ?? null;
  const swissRoundNum = match.swissRound?.roundNumber ?? null;
  const hasSwiss = type === "SWISS" || swissRoundNum !== null;

  // ── Swiss ────────────────────────────────────────────────────────────────
  if (hasSwiss) {
    const roundNum = swissRoundNum ?? 0;
    return {
      key: `swiss-${roundNum.toString().padStart(3, "0")}`,
      label: "Fase Suíça",
      sublabel: `Rodada ${roundNum}`,
      type: "swiss",
      sortOrder: roundNum,
    };
  }

  // ── Bracket / Playoff ────────────────────────────────────────────────────
  if (type === "BRACKET" || bp) {
    const position = bp ?? "";
    const phaseLabel = position ? bracketPositionToLabel(position) : name;

    let phaseOrder = 50;
    const pu = position.toUpperCase();
    if (pu.startsWith("RO16") || pu.startsWith("R016")) phaseOrder = 10;
    else if (pu.startsWith("QF")) phaseOrder = 20;
    else if (pu.startsWith("SF")) phaseOrder = 30;
    else if (pu.startsWith("THIRD") || pu === "3RD" || pu === "THIRD_PLACE") phaseOrder = 40;
    else if (pu.startsWith("FINAL")) phaseOrder = 50;

    const phaseKey = pu.startsWith("RO16") || pu.startsWith("R016") ? "RO16"
      : pu.startsWith("QF") ? "QF"
      : pu.startsWith("SF") ? "SF"
      : pu.startsWith("THIRD") || pu === "3RD" || pu === "THIRD_PLACE" ? "THIRD"
      : pu.startsWith("FINAL") ? "FINAL"
      : position || "BRACKET";

    return {
      key: `bracket-${phaseKey}`,
      label: "Playoffs",
      sublabel: phaseLabel,
      type: "bracket",
      sortOrder: 1000 + phaseOrder,
    };
  }

  // ── Outros (group stage, round robin, etc.) ──────────────────────────────
  const rawRound = match.round ?? "";
  const num = rawRound.replace(/\D/g, "");
  const roundNum = num ? parseInt(num, 10) : 0;
  const key = `other-${order.toString().padStart(3, "0")}-${roundNum.toString().padStart(3, "0")}`;
  return {
    key,
    label: name || "Partidas",
    sublabel: rawRound || undefined,
    type: "other",
    sortOrder: 500 + order * 100 + roundNum,
  };
}

// ── Ícones por tipo ───────────────────────────────────────────────────────────

function GroupIcon({ type, sublabel }: { type: GroupInfo["type"]; sublabel?: string }) {
  if (type === "bracket") {
    const s = (sublabel ?? "").toUpperCase();
    if (s === "FINAL" || s.includes("FINAL")) return <Trophy className="h-4 w-4 text-gold" />;
    if (s.includes("SEMI")) return <Star className="h-4 w-4 text-gold/80" />;
    return <GitBranch className="h-4 w-4 text-gold/70" />;
  }
  if (type === "swiss") return <Swords className="h-4 w-4 text-[#4d7ecf]" />;
  return <Layers className="h-4 w-4 text-muted" />;
}

// ── Divider de grupo ──────────────────────────────────────────────────────────

function GroupDivider({ info, count }: { info: GroupInfo; count: number }) {
  const isPlayoff = info.type === "bracket";
  const isSwiss = info.type === "swiss";

  return (
    <div className="flex items-center gap-3">
      {/* Linha esquerda */}
      <div
        className={`h-px flex-1 ${
          isPlayoff
            ? "bg-gradient-to-r from-transparent to-gold/40"
            : isSwiss
            ? "bg-gradient-to-r from-transparent to-[#1a3a6e]/60"
            : "bg-gradient-to-r from-transparent to-border"
        }`}
      />

      {/* Bloco central */}
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
          isPlayoff
            ? "border-gold/30 bg-gradient-to-r from-[#2a1f06]/80 to-[#1a1200]/60"
            : isSwiss
            ? "border-[#1a3a6e] bg-[#0d1e3d]/60"
            : "border-border bg-surface/60"
        }`}
      >
        <GroupIcon type={info.type} sublabel={info.sublabel} />

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              isPlayoff ? "text-gold/60" : isSwiss ? "text-[#4d7ecf]/70" : "text-muted"
            }`}
          >
            {info.label}
          </span>

          {info.sublabel && (
            <>
              <ChevronRight
                className={`h-2.5 w-2.5 ${
                  isPlayoff ? "text-gold/40" : isSwiss ? "text-[#4d7ecf]/40" : "text-muted/40"
                }`}
              />
              <span
                className={`text-xs font-bold uppercase tracking-wide ${
                  isPlayoff ? "text-gold" : isSwiss ? "text-[#4d7ecf]" : "text-paper"
                }`}
              >
                {info.sublabel}
              </span>
            </>
          )}
        </div>

        <span
          className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            isPlayoff
              ? "bg-gold/15 text-gold/80"
              : isSwiss
              ? "bg-[#1a3a6e]/60 text-[#4d7ecf]"
              : "bg-surface text-muted"
          }`}
        >
          {count}
        </span>
      </div>

      {/* Linha direita */}
      <div
        className={`h-px flex-1 ${
          isPlayoff
            ? "bg-gradient-to-l from-transparent to-gold/40"
            : isSwiss
            ? "bg-gradient-to-l from-transparent to-[#1a3a6e]/60"
            : "bg-gradient-to-l from-transparent to-border"
        }`}
      />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface MatchesGroupedViewProps {
  matches: Match[];
}

export function MatchesGroupedView({ matches }: MatchesGroupedViewProps) {
  // 1. Calcular GroupInfo para cada partida
  // 2. Agrupar por key
  // 3. Ordenar grupos por sortOrder

  const groupMap = new Map<string, { info: GroupInfo; matches: Match[] }>();

  for (const match of matches) {
    const info = getGroupInfo(match);
    if (!groupMap.has(info.key)) {
      groupMap.set(info.key, { info, matches: [] });
    }
    groupMap.get(info.key)!.matches.push(match);
  }

  // Ordenar grupos por sortOrder
  const groups = Array.from(groupMap.values()).sort(
    (a, b) => b.info.sortOrder - a.info.sortOrder
  );

  return (
    <div className="space-y-8">
      {groups.map(({ info, matches: groupMatches }) => (
        <section key={info.key} className="space-y-4">
          <GroupDivider info={info} count={groupMatches.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
