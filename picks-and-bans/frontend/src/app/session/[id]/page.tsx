"use client";

import { use, useState, useEffect } from "react";
import { RefreshCw, Copy, Check, X, CheckCircle, User, ShieldOff } from "lucide-react";
import { MAPS, PickBanSession, MapName, SeriesFormat } from "@/types";
import { cn } from "@/lib/utils";
import { getSession, joinSession, makeAction, resetSession as apiResetSession } from "@/lib/api";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<PickBanSession | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B" | null>(null);
  const [leaderNick, setLeaderNick] = useState("");
  const [inputNick, setInputNick] = useState("");
  const [copied, setCopied] = useState(false);
  const [resultsCopied, setResultsCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminated, setTerminated] = useState(false);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const initSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await getSession(id);

        // Verificar se já está derrubada ao carregar
        if ((sessionData as any).status === 'TERMINATED') {
          setTerminated(true);
          setLoading(false);
          return;
        }

        setSession(sessionData);

        const savedTeam = localStorage.getItem(`session-${id}-team`);
        const savedNick = localStorage.getItem(`session-${id}-nick`);

        if ((savedTeam === "A" || savedTeam === "B") && savedNick) {
          setSelectedTeam(savedTeam);
          setLeaderNick(savedNick);
        }

        setLoading(false);

        // Polling a cada 2 segundos
        pollingInterval = setInterval(async () => {
          try {
            const updatedSession = await getSession(id);
            // Detectar se foi derrubada pelo super admin
            if ((updatedSession as any).status === 'TERMINATED') {
              setTerminated(true);
              if (pollingInterval) clearInterval(pollingInterval);
              return;
            }
            setSession(updatedSession);
          } catch (err) {
            console.error("Erro no polling:", err);
          }
        }, 2000);

      } catch (err) {
        setError("Sessão não encontrada ou servidor offline");
        setLoading(false);
      }
    };

    initSession();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [id]);

  const selectTeamWithNick = async (team: "A" | "B") => {
    const nick = inputNick.trim();
    if (!nick) {
      alert("Digite seu nickname!");
      return;
    }

    try {
      await joinSession(id, team, nick);
      setSelectedTeam(team);
      setLeaderNick(nick);
      localStorage.setItem(`session-${id}-team`, team);
      localStorage.setItem(`session-${id}-nick`, nick);
    } catch (error) {
      alert("Erro ao entrar na sessão");
    }
  };

  const handleAction = async (map: MapName) => {
    if (!session || session.status !== "IN_PROGRESS" || !selectedTeam) return;
    if (session.currentTurn !== selectedTeam) {
      alert("Não é a vez do seu time!");
      return;
    }

    const usedMaps = session.actions.map((a) => a.map);
    if (usedMaps.includes(map)) return;

    try {
      await makeAction(id, selectedTeam, map);
    } catch (error: any) {
      alert(error.message || "Erro ao fazer ação");
    }
  };

  const copyResults = () => {
    if (!session) return;

    const fmt = seriesFormat ?? 'BO3';
    const tA = session.teamA.name;
    const tB = session.teamB.name;

    // Todas as ações da sessão em ordem
    const allActions = [...session.actions].sort((a, b) => a.order - b.order);
    // Picks reais (não decider), em ordem de execução
    const picks = allActions.filter((a) => a.action === "PICK" && (a.team as string) !== "DECIDER");
    // Mapa decider (tem team === 'DECIDER')
    const deciderMap = allActions.find((a) => (a.team as string) === "DECIDER")?.map ?? '—';

    let resultText = '';

    if (fmt === 'BO1') {
      // BO1: 6 bans → sobra 1 mapa = decider, lado CT pela organização
      resultText =
`🎮 *ECL PICKS & BANS - RESULTADO* 🎮

⚔️ *${tA}* vs *${tB}*
📋 Formato: *BO1*

🗺️ *MAPA:*
🏆 *${deciderMap}*
   🎲 Lado CT definido pela organização (ORG Decide)

---
Bora jogar! 🔥`;

    } else if (fmt === 'BO5') {
      // BO5: A pick, B pick, A ban, B ban, A pick, B pick → decider
      // picks[0] = A pick (map1), picks[1] = B pick (map2),
      // picks[2] = A pick (map3), picks[3] = B pick (map4)
      const map1 = picks[0]?.map ?? '—';  // A pick → B CT
      const map2 = picks[1]?.map ?? '—';  // B pick → A CT
      const map3 = picks[2]?.map ?? '—';  // A pick → B CT
      const map4 = picks[3]?.map ?? '—';  // B pick → A CT

      resultText =
`🎮 *ECL PICKS & BANS - RESULTADO* 🎮

⚔️ *${tA}* vs *${tB}*
📋 Formato: *BO5*

📍 *MAPAS:*

1️⃣ Mapa 1: *${map1}* (escolha de ${tA})
   🛡️ ${tB} começa de CT

2️⃣ Mapa 2: *${map2}* (escolha de ${tB})
   🛡️ ${tA} começa de CT

3️⃣ Mapa 3: *${map3}* (escolha de ${tA})
   🛡️ ${tB} começa de CT

4️⃣ Mapa 4: *${map4}* (escolha de ${tB})
   🛡️ ${tA} começa de CT

🏆 Mapa 5 Decider: *${deciderMap}*
   🛡️ Vencedor de ${map1} começa de CT

---
Bora jogar! 🔥`;

    } else {
      // BO3: A ban, B ban, A pick, B pick, B ban, A ban → decider
      // picks[0] = A pick (map1) → B CT
      // picks[1] = B pick (map2) → A CT
      const map1 = picks[0]?.map ?? '—';
      const map2 = picks[1]?.map ?? '—';

      resultText =
`🎮 *ECL PICKS & BANS - RESULTADO* 🎮

⚔️ *${tA}* vs *${tB}*
📋 Formato: *BO3*

📍 *MAPAS ESCOLHIDOS:*

1️⃣ Mapa 1: *${map1}* (escolha de ${tA})
   🛡️ ${tB} começa de CT

2️⃣ Mapa 2: *${map2}* (escolha de ${tB})
   🛡️ ${tA} começa de CT

🏆 Mapa 3 Decider: *${deciderMap}*
   🛡️ Vencedor de ${map1} começa de CT

---
Bora jogar! 🔥`;
    }

    navigator.clipboard.writeText(resultText);
    setResultsCopied(true);
    setTimeout(() => setResultsCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
          <p className="text-muted">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <X className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-paper">{error}</h1>
          <p className="mb-4 text-sm text-muted">Verifique se o servidor está rodando</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gold px-6 py-2 font-bold text-ink transition-all hover:bg-gold-light"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Tela: SESSÃO DERRUBADA PELO SUPER ADMIN
  if (terminated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050d1a] p-4">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-lg text-center">
          {/* Ícone animado */}
          <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
            <div className="absolute inset-0 rounded-full border border-red-500/50" />
            <div className="flex h-full w-full items-center justify-center rounded-full bg-red-500/10">
              <ShieldOff className="h-12 w-12 text-red-400" />
            </div>
          </div>

          {/* Título */}
          <h1
            className="mb-3 text-4xl font-black uppercase tracking-widest text-red-400 sm:text-5xl"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Sessão Não Autorizada
          </h1>

          {/* Linha dourada */}
          <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

          {/* Mensagem */}
          <p className="mb-2 text-lg font-semibold text-white">
            Esta sessão foi encerrada pelo Super Admin.
          </p>
          <p className="mb-8 text-sm text-gray-500 leading-relaxed">
            A realização de picks e bans nesta sessão não é mais permitida.
            Entre em contato com o administrador da liga para mais informações.
          </p>

          {/* Badge ECL */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-400">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Elite Champions League — Acesso Revogado
          </div>
        </div>
      </div>
    );
  }

  // Tela de seleção
  if (!selectedTeam || !leaderNick) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-4">
        <div className="w-full max-w-2xl">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="mb-2 font-display text-3xl font-bold uppercase text-paper sm:text-4xl">
              Entrar na Sessão
            </h1>
            <p className="text-sm text-muted sm:text-base">Digite seu nickname e selecione seu time</p>
          </div>

          <div className="mb-6 sm:mb-8">
            <label className="mb-2 block text-center text-sm font-medium text-paper">
              Seu Nickname
            </label>
            <input
              type="text"
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="Digite seu apelido"
              maxLength={20}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-center text-base text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Layout LOGO X LOGO */}
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Time A */}
            <button
              onClick={() => selectTeamWithNick("A")}
              disabled={!inputNick.trim()}
              className="group relative transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <div className="relative">
                {session?.teamA.logoUrl ? (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-border bg-navy/50 p-3 transition-all group-hover:border-gold group-hover:shadow-lg group-hover:shadow-gold/30 sm:h-36 sm:w-36 sm:p-4">
                    <img 
                      src={session.teamA.logoUrl} 
                      alt={session.teamA.name} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-border bg-navy transition-all group-hover:border-gold group-hover:shadow-lg group-hover:shadow-gold/30 sm:h-36 sm:w-36">
                    <User className="h-12 w-12 text-gold sm:h-16 sm:w-16" />
                  </div>
                )}
                {!session?.teamA.logoUrl && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-xs font-bold text-paper">
                    {session?.teamA.name || "Time A"}
                  </div>
                )}
              </div>
            </button>

            {/* VS */}
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-gold px-4 py-2 font-display text-xl font-bold text-ink sm:px-6 sm:py-3 sm:text-2xl">
                VS
              </div>
            </div>

            {/* Time B */}
            <button
              onClick={() => selectTeamWithNick("B")}
              disabled={!inputNick.trim()}
              className="group relative transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <div className="relative">
                {session?.teamB.logoUrl ? (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-border bg-navy/50 p-3 transition-all group-hover:border-gold group-hover:shadow-lg group-hover:shadow-gold/30 sm:h-36 sm:w-36 sm:p-4">
                    <img 
                      src={session.teamB.logoUrl} 
                      alt={session.teamB.name} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-border bg-navy transition-all group-hover:border-gold group-hover:shadow-lg group-hover:shadow-gold/30 sm:h-36 sm:w-36">
                    <User className="h-12 w-12 text-gold sm:h-16 sm:w-16" />
                  </div>
                )}
                {!session?.teamB.logoUrl && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-xs font-bold text-paper">
                    {session?.teamB.name || "Time B"}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Informações adicionais */}
          {(session?.teamA.leader || session?.teamB.leader) && (
            <div className="mt-6 text-center text-xs text-muted">
              {session?.teamA.leader && <p>Líder Time A: {session.teamA.leader}</p>}
              {session?.teamB.leader && <p>Líder Time B: {session.teamB.leader}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
          <p className="text-muted">Sincronizando...</p>
        </div>
      </div>
    );
  }

  const usedMaps = session.actions.map((a) => a.map);
  const pickedMaps = session.actions.filter((a) => a.action === "PICK" && (a.team as string) !== "DECIDER");
  // Decider = última ação com team === 'DECIDER'
  const decider = session.actions.find((a) => (a.team as string) === "DECIDER");

  // seriesFormat: usa o valor da sessão se disponível.
  // Fallback inteligente baseado na quantidade de picks (para versões antigas sem o campo):
  // 0 picks = BO1 | 4+ picks = BO5 | outros = BO3
  const rawFmt = (session.seriesFormat as string) || "";
  const seriesFormat: SeriesFormat =
    rawFmt === "BO1" ? "BO1"
    : rawFmt === "BO5" ? "BO5"
    : rawFmt === "BO3" ? "BO3"
    : pickedMaps.length === 0 ? "BO1"
    : pickedMaps.length >= 4 ? "BO5"
    : "BO3";

  const seriesLabel: Record<string, string> = {
    BO1: 'BO1 — Melhor de 1',
    BO3: 'BO3 — Melhor de 3',
    BO5: 'BO5 — Melhor de 5',
  };

  return (
    <div className="min-h-screen bg-ink">
      <div className="container-ecl py-3 sm:py-4 lg:py-6">
        {/* Header Minimalista */}
        <header className="mb-3 text-center sm:mb-4 lg:mb-5">
          <h1 className="mb-2 font-display text-xl font-bold uppercase text-paper sm:mb-3 sm:text-2xl lg:text-3xl">
            Pick & Ban
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1.5 backdrop-blur-sm sm:gap-2 sm:px-4">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 sm:h-2 sm:w-2"></div>
              <span className="text-xs font-medium text-muted sm:text-sm">
                {leaderNick}
              </span>
            </div>
            {seriesFormat && (
              <div className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5">
                <span className="text-xs font-bold text-gold sm:text-sm">
                  {seriesFormat}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Alerta de Turno */}
        {session.status === "IN_PROGRESS" && (
          <div className="mb-3 sm:mb-4 lg:mb-5">
            {session.currentTurn === selectedTeam ? (
              <div className={cn(
                "rounded-xl border-2 p-3 text-center shadow-lg sm:p-4 lg:p-5",
                session.currentAction === "BAN" 
                  ? "border-red-500 bg-gradient-to-br from-red-950/40 to-red-900/20" 
                  : "border-green-500 bg-gradient-to-br from-green-950/40 to-green-900/20"
              )}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">É a sua vez!</p>
                <h2 className={cn(
                  "mb-1.5 font-display text-xl font-bold uppercase sm:mb-2 sm:text-2xl lg:text-3xl",
                  session.currentAction === "BAN" ? "text-red-400" : "text-green-400"
                )}>
                  {session.currentAction === "BAN" ? "🚫 Banir Mapa" : "✅ Escolher Mapa"}
                </h2>
                <p className="text-xs text-paper/80 sm:text-sm">
                  Toque no mapa que deseja {session.currentAction === "BAN" ? "banir" : "escolher"}
                </p>
              </div>
            ) : (
              <div className="card-ecl bg-surface/50 p-2.5 text-center backdrop-blur-sm sm:p-3 lg:p-4">
                <p className="text-xs text-muted sm:text-sm lg:text-base">
                  Aguardando{" "}
                  <strong className="font-display text-gold">
                    {session.currentTurn === "A" ? session.teamA.name : session.teamB.name}
                  </strong>{" "}
                  {session.currentAction === "BAN" ? "banir" : "escolher"}...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Times - Layout LOGO X LOGO */}
        <div className="mb-3 sm:mb-4 lg:mb-5">
          <div className="flex items-center justify-center gap-3 sm:gap-5 lg:gap-8">
            {/* Time A */}
            <div className="relative">
              <div className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-xl border-2 p-2 transition-all sm:h-24 sm:w-24 sm:p-2.5 lg:h-28 lg:w-28 lg:p-3",
                session.currentTurn === "A" && session.status === "IN_PROGRESS" 
                  ? "animate-pulse border-green-500 shadow-lg shadow-green-500/50" 
                  : "border-border",
                selectedTeam === "A" && "ring-2 ring-gold/50 sm:ring-4"
              )}>
                {session.teamA.logoUrl ? (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-navy/50">
                    <img 
                      src={session.teamA.logoUrl} 
                      alt={session.teamA.name} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-navy">
                    <User className="h-7 w-7 text-gold sm:h-9 sm:w-9 lg:h-11 lg:w-11" />
                  </div>
                )}
              </div>
              
              {/* Tags Dinâmicas */}
              {session.status === "IN_PROGRESS" && (
                <>
                  {selectedTeam === "A" && session.currentTurn === "A" && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 animate-pulse whitespace-nowrap rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow-lg shadow-green-500/50 sm:-top-2 sm:px-3 sm:py-1">
                      Você
                    </div>
                  )}
                  {selectedTeam === "A" && session.currentTurn !== "A" && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 text-xs font-bold uppercase text-ink shadow-lg sm:-top-2 sm:px-3 sm:py-1">
                      Você
                    </div>
                  )}
                  {selectedTeam === "B" && session.currentTurn === "A" && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 animate-pulse whitespace-nowrap rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow-lg shadow-green-500/50 sm:-top-2 sm:px-3 sm:py-1">
                      Adversário
                    </div>
                  )}
                </>
              )}
              
              {session.status !== "IN_PROGRESS" && selectedTeam === "A" && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 text-xs font-bold uppercase text-ink shadow-lg sm:-top-2 sm:px-3 sm:py-1">
                  Você
                </div>
              )}
              
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-paper shadow-md sm:-bottom-2 sm:px-3 sm:py-1">
                {session.teamA.tag || session.teamA.name.substring(0, 6)}
              </div>
            </div>

            {/* VS Central */}
            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
              <div className="rounded-lg bg-gold px-3 py-1.5 font-display text-lg font-bold text-ink sm:px-4 sm:py-2 sm:text-xl lg:text-2xl">
                VS
              </div>
              {session.status === "IN_PROGRESS" && (
                <div className="text-base font-bold text-green-500 sm:text-lg lg:text-xl">
                  {session.currentTurn === "A" ? "→" : "←"}
                </div>
              )}
            </div>

            {/* Time B */}
            <div className="relative">
              <div className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-xl border-2 p-2 transition-all sm:h-24 sm:w-24 sm:p-2.5 lg:h-28 lg:w-28 lg:p-3",
                session.currentTurn === "B" && session.status === "IN_PROGRESS" 
                  ? "animate-pulse border-green-500 shadow-lg shadow-green-500/50" 
                  : "border-border",
                selectedTeam === "B" && "ring-2 ring-gold/50 sm:ring-4"
              )}>
                {session.teamB.logoUrl ? (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-navy/50">
                    <img 
                      src={session.teamB.logoUrl} 
                      alt={session.teamB.name} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-navy">
                    <User className="h-7 w-7 text-gold sm:h-9 sm:w-9 lg:h-11 lg:w-11" />
                  </div>
                )}
              </div>
              
              {session.status === "IN_PROGRESS" && (
                <>
                  {selectedTeam === "B" && session.currentTurn === "B" && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 animate-pulse whitespace-nowrap rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow-lg shadow-green-500/50 sm:-top-2 sm:px-3 sm:py-1">
                      Você
                    </div>
                  )}
                  {selectedTeam === "B" && session.currentTurn !== "B" && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 text-xs font-bold uppercase text-ink shadow-lg sm:-top-2 sm:px-3 sm:py-1">
                      Você
                    </div>
                  )}
                  {selectedTeam === "A" && session.currentTurn === "B" && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 animate-pulse whitespace-nowrap rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow-lg shadow-green-500/50 sm:-top-2 sm:px-3 sm:py-1">
                      Adversário
                    </div>
                  )}
                </>
              )}
              
              {session.status !== "IN_PROGRESS" && selectedTeam === "B" && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 text-xs font-bold uppercase text-ink shadow-lg sm:-top-2 sm:px-3 sm:py-1">
                  Você
                </div>
              )}
              
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-paper shadow-md sm:-bottom-2 sm:px-3 sm:py-1">
                {session.teamB.tag || session.teamB.name.substring(0, 6)}
              </div>
            </div>
          </div>
        </div>

        {/* Mapas - Grid com último centralizado */}
        <div className="mb-4 sm:mb-6">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
            {MAPS.map((map, index) => {
              const action = session.actions.find((a) => a.map === map);
              const isAvailable = !usedMaps.includes(map);
              const isBanned = action?.action === "BAN";
              const isPicked = action?.action === "PICK";
              const teamName = action?.team === "A" ? session.teamA.name : session.teamB.name;
              const canInteract = isAvailable && session.status === "IN_PROGRESS" && session.currentTurn === selectedTeam;
              
              // Determinar quem começa de CT
              let ctInfo = "";
              if (isPicked && action.order !== 7) {
                const ctTeam = action.team === "A" ? session.teamB.name : session.teamA.name;
                ctInfo = `${ctTeam} CT`;
              } else if (action?.order === 7) {
                const firstPickedMap = pickedMaps[0]?.map || "Mapa 1";
                ctInfo = `Vencedor ${firstPickedMap} CT`;
              }

              return (
                <button
                  key={map}
                  onClick={() => canInteract && handleAction(map)}
                  disabled={!canInteract}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border-2 transition-all sm:rounded-xl",
                    "w-[calc(50%-4px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-12px)]",
                    canInteract 
                      ? "border-gold/50 shadow-lg shadow-gold/20 hover:scale-105 hover:border-gold active:scale-95" 
                      : isBanned
                      ? "border-red-500"
                      : isPicked && action.order !== 7
                      ? "border-green-500"
                      : action?.order === 7
                      ? "border-gold"
                      : "border-border"
                  )}
                >
                  {/* Imagem do mapa com blur quando selecionado */}
                  <div className={cn(
                    "aspect-[16/11] w-full overflow-hidden bg-navy relative",
                    action && "blur-sm"
                  )}>
                    <img 
                      src={`/images/maps/${map.toLowerCase()}.png`} 
                      alt={map} 
                      className="h-full w-full object-cover transition-transform group-hover:scale-110" 
                      loading="lazy" 
                    />
                  </div>
                  
                  {/* Nome do mapa */}
                  <div className="relative bg-surface p-1.5 sm:p-2 lg:p-2.5">
                    <p className="truncate font-display text-xs font-bold uppercase text-paper sm:text-sm">
                      {map}
                    </p>
                  </div>

                  {/* Overlay com informações quando selecionado */}
                  {action && (
                    <div className={cn(
                      "absolute inset-0 z-10 flex flex-col items-center justify-center p-2 sm:p-3",
                      isBanned && "bg-red-950/80",
                      isPicked && action.order !== 7 && "bg-green-950/80",
                      action.order === 7 && "bg-yellow-900/80"
                    )}>
                      {isBanned && (
                        <>
                          <div className="mb-1.5 rounded-full bg-red-600 p-2 sm:mb-2 sm:p-2.5">
                            <X className="h-6 w-6 text-white sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                          </div>
                          <p className="mb-1 text-center text-xs font-black uppercase text-white drop-shadow-lg sm:text-sm">
                            Banido
                          </p>
                          <p className="rounded-md bg-black/60 px-2 py-0.5 text-center text-xs font-bold text-white">
                            {teamName}
                          </p>
                        </>
                      )}
                      
                      {isPicked && action.order !== 7 && (
                        <>
                          <div className="mb-1.5 rounded-full bg-green-600 p-2 sm:mb-2 sm:p-2.5">
                            <CheckCircle className="h-6 w-6 text-white sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                          </div>
                          <p className="mb-1 text-center text-xs font-black uppercase text-white drop-shadow-lg sm:text-sm">
                            Escolhido
                          </p>
                          <p className="mb-1 rounded-md bg-black/60 px-2 py-0.5 text-center text-xs font-bold text-white">
                            {teamName}
                          </p>
                          {ctInfo && (
                            <div className="mt-0.5 flex items-center gap-1 rounded-md bg-blue-600 px-1.5 py-0.5 shadow-lg">
                              <span className="text-xs">🛡️</span>
                              <p className="text-center text-xs font-bold leading-tight text-white">
                                {ctInfo}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {action.order === 7 && (
                        <>
                          <div className="mb-1.5 text-3xl drop-shadow-lg sm:mb-2 sm:text-4xl">🏆</div>
                          <p className="mb-1 text-center font-display text-sm font-black uppercase text-white drop-shadow-lg sm:mb-1.5 sm:text-base lg:text-lg">
                            DECIDER
                          </p>
                          {ctInfo && (
                            <div className="mt-0.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 shadow-lg">
                              <span className="text-xs">🛡️</span>
                              <p className="text-center text-xs font-bold leading-tight text-yellow-300">
                                {ctInfo}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resultado */}
        {session.status === "COMPLETED" && (
          <div className="rounded-xl border-2 border-gold bg-gradient-to-br from-navy via-surface to-navy p-3 shadow-2xl shadow-gold/20 sm:p-4 lg:p-6">
            {/* Header */}
            <div className="mb-3 text-center sm:mb-4 lg:mb-6">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 sm:mb-3 sm:h-16 sm:w-16">
                <CheckCircle className="h-7 w-7 text-green-400 sm:h-10 sm:w-10" />
              </div>
              <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-tight text-gold sm:mb-2 sm:text-2xl lg:text-3xl">
                Pick & Ban Concluído!
              </h2>
              <p className="text-xs text-muted sm:text-sm">Os mapas foram definidos</p>
            </div>

            {/* Mapas Escolhidos */}
            <div className="mb-3 space-y-2 sm:mb-4 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
              {/* Mapa 1 */}
              <div className="rounded-lg border-2 border-green-500/50 bg-green-950/30 p-3 backdrop-blur-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-bold uppercase text-white">
                    Mapa 1
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                <p className="mb-0.5 font-display text-base font-bold text-white sm:text-lg lg:text-xl">
                  {pickedMaps[0]?.map}
                </p>
                <p className="mb-1.5 text-xs text-green-200">
                  {session.teamA.name}
                </p>
                <div className="flex items-center gap-1 rounded-lg bg-blue-600/80 px-1.5 py-1">
                  <span className="text-xs">🛡️</span>
                  <p className="text-xs font-bold leading-tight text-white">
                    {session.teamB.name} CT
                  </p>
                </div>
              </div>

              {/* Mapa 2 */}
              <div className="rounded-lg border-2 border-green-500/50 bg-green-950/30 p-3 backdrop-blur-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-bold uppercase text-white">
                    Mapa 2
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                <p className="mb-0.5 font-display text-base font-bold text-white sm:text-lg lg:text-xl">
                  {pickedMaps[1]?.map}
                </p>
                <p className="mb-1.5 text-xs text-green-200">
                  {session.teamB.name}
                </p>
                <div className="flex items-center gap-1 rounded-lg bg-blue-600/80 px-1.5 py-1">
                  <span className="text-xs">🛡️</span>
                  <p className="text-xs font-bold leading-tight text-white">
                    {session.teamA.name} CT
                  </p>
                </div>
              </div>

              {/* Decider */}
              <div className="rounded-lg border-2 border-gold bg-gradient-to-br from-yellow-900/40 to-gold/20 p-3 backdrop-blur-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="rounded-md bg-gold px-1.5 py-0.5 text-xs font-bold uppercase text-black">
                    Decider
                  </span>
                  <span className="text-lg">🏆</span>
                </div>
                <p className="mb-0.5 font-display text-base font-bold text-gold sm:text-lg lg:text-xl">
                  {decider?.map}
                </p>
                <p className="mb-1.5 text-xs text-yellow-200">
                  Mapa decisivo
                </p>
                <div className="flex items-center gap-1 rounded-lg bg-black/50 px-1.5 py-1">
                  <span className="text-xs">🛡️</span>
                  <p className="text-xs font-bold leading-tight text-yellow-300">
                    Vencedor {pickedMaps[0]?.map} CT
                  </p>
                </div>
              </div>
            </div>

            {/* Botão Copiar */}
            <button
              onClick={copyResults}
              className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-green-600 to-green-500 p-[2px] transition-all hover:shadow-lg hover:shadow-green-500/50 sm:rounded-xl"
            >
              <div className="flex items-center justify-center gap-1.5 rounded-[6px] bg-gradient-to-r from-green-600 to-green-500 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white transition-all sm:gap-2 sm:rounded-[10px] sm:px-6 sm:py-3 sm:text-base">
                {resultsCopied ? (
                  <>
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Copiar Resultado para WhatsApp</span>
                    <span className="sm:hidden">Copiar para WhatsApp</span>
                  </>
                )}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
