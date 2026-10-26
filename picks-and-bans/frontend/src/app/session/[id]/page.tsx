"use client";

import { use, useState, useEffect } from "react";
import { RefreshCw, Copy, Check, X, CheckCircle, User } from "lucide-react";
import { MAPS, PickBanSession, MapName } from "@/types";
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

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const initSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await getSession(id);
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
    
    const resultText = `🎮 *ECL PICKS & BANS - RESULTADO* 🎮

⚔️ *${session.teamA.name}* vs *${session.teamB.name}*

📍 *MAPAS ESCOLHIDOS:*

1️⃣ Mapa 1: *${pickedMaps[0]?.map}* (${session.teamA.name})
   🛡️ ${session.teamB.name} começa de CT

2️⃣ Mapa 2: *${pickedMaps[1]?.map}* (${session.teamB.name})
   🛡️ ${session.teamA.name} começa de CT

🏆 Decider: *${decider?.map}*
   🛡️ Vencedor de ${pickedMaps[0]?.map} começa de CT

---
Bora jogar! 🔥`;

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

  // Tela de seleção
  if (!selectedTeam || !leaderNick) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-display text-3xl font-bold uppercase text-paper">
              Entrar na Sessão
            </h1>
            <p className="text-sm text-muted">Digite seu nickname e selecione seu time</p>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-paper">
              Seu Nickname
            </label>
            <input
              type="text"
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="Digite seu apelido"
              maxLength={20}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => selectTeamWithNick("A")}
              disabled={!inputNick.trim()}
              className="card-ecl p-4 transition-all hover:border-gold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-lg font-bold text-gold">
                {session?.teamA.tag || "A"}
              </div>
              <p className="text-xs font-medium uppercase text-muted">Time A</p>
              <p className="font-display text-lg font-bold text-paper">{session?.teamA.name || "Time A"}</p>
              {session?.teamA.leader && (
                <p className="mt-1 text-xs text-gold">Líder: {session.teamA.leader}</p>
              )}
            </button>

            <button
              onClick={() => selectTeamWithNick("B")}
              disabled={!inputNick.trim()}
              className="card-ecl p-4 transition-all hover:border-gold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-lg font-bold text-gold">
                {session?.teamB.tag || "B"}
              </div>
              <p className="text-xs font-medium uppercase text-muted">Time B</p>
              <p className="font-display text-lg font-bold text-paper">{session?.teamB.name || "Time B"}</p>
              {session?.teamB.leader && (
                <p className="mt-1 text-xs text-gold">Líder: {session.teamB.leader}</p>
              )}
            </button>
          </div>
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
  const pickedMaps = session.actions.filter((a) => a.action === "PICK");
  const decider = session.actions.find((a) => a.order === 7);

  return (
    <div className="min-h-screen bg-ink">
      <div className="container-ecl py-4 sm:py-6">
        {/* Header */}
        <header className="mb-4 text-center">
          <h1 className="mb-1 font-display text-2xl font-bold uppercase text-paper sm:text-3xl">
            Pick & Ban
          </h1>
          <div className="inline-flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-xs sm:text-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
            <span className="font-medium text-muted">
              {leaderNick} • {selectedTeam === "A" ? session.teamA.name : session.teamB.name}
            </span>
          </div>
        </header>

        {/* Alerta de Turno */}
        {session.status === "IN_PROGRESS" && (
          <div className="mb-4">
            {session.currentTurn === selectedTeam ? (
              <div className={cn(
                "rounded-lg border-2 p-4 text-center",
                session.currentAction === "BAN" ? "border-red-500 bg-red-950/30" : "border-green-500 bg-green-950/30"
              )}>
                <p className="mb-1 text-xs font-medium uppercase text-muted">É a sua vez!</p>
                <h2 className={cn(
                  "font-display text-2xl font-bold uppercase sm:text-3xl",
                  session.currentAction === "BAN" ? "text-red-400" : "text-green-400"
                )}>
                  {session.currentAction === "BAN" ? "🚫 Banir Mapa" : "✅ Escolher Mapa"}
                </h2>
                <p className="mt-2 text-sm text-paper/80">
                  Toque no mapa que deseja {session.currentAction === "BAN" ? "banir" : "escolher"}
                </p>
              </div>
            ) : (
              <div className="card-ecl p-3 text-center">
                <p className="text-sm text-muted">
                  Aguardando <strong className="text-gold">{session.currentTurn === "A" ? session.teamA.name : session.teamB.name}</strong> {session.currentAction === "BAN" ? "banir" : "escolher"}...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Times */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-4">
          <div className={cn("card-ecl p-3 sm:p-4", session.currentTurn === "A" && session.status === "IN_PROGRESS" && "animate-pulse-border", selectedTeam === "A" && "ring-2 ring-gold")}>
            {selectedTeam === "A" && <div className="mb-2 inline-block rounded-md bg-gold px-2 py-0.5 text-xs font-bold uppercase text-ink">Você</div>}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-sm font-bold text-gold sm:h-12 sm:w-12">{session.teamA.tag}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase text-muted">Time A</p>
                <p className="truncate font-display text-base font-bold text-paper sm:text-lg">{session.teamA.name}</p>
              </div>
            </div>
          </div>

          <div className={cn("card-ecl p-3 sm:p-4", session.currentTurn === "B" && session.status === "IN_PROGRESS" && "animate-pulse-border", selectedTeam === "B" && "ring-2 ring-gold")}>
            {selectedTeam === "B" && <div className="mb-2 inline-block rounded-md bg-gold px-2 py-0.5 text-xs font-bold uppercase text-ink">Você</div>}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-sm font-bold text-gold sm:h-12 sm:w-12">{session.teamB.tag}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase text-muted">Time B</p>
                <p className="truncate font-display text-base font-bold text-paper sm:text-lg">{session.teamB.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mapas */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {MAPS.map((map) => {
            const action = session.actions.find((a) => a.map === map);
            const isAvailable = !usedMaps.includes(map);
            const isBanned = action?.action === "BAN";
            const isPicked = action?.action === "PICK";
            const teamName = action?.team === "A" ? session.teamA.name : session.teamB.name;
            const canInteract = isAvailable && session.status === "IN_PROGRESS" && session.currentTurn === selectedTeam;
            
            // Determinar quem começa de CT
            let ctInfo = "";
            if (isPicked && action.order !== 7) {
              // Mapa escolhido (não decider): o time oposto começa de CT
              const ctTeam = action.team === "A" ? session.teamB.name : session.teamA.name;
              ctInfo = `${ctTeam} inicia CT`;
            } else if (action?.order === 7) {
              // Decider: quem ganhou o mapa 1 começa de CT
              const firstPickedMap = pickedMaps[0]?.map || "Mapa 1";
              ctInfo = `Vencedor de ${firstPickedMap} inicia CT`;
            }

            return (
              <button
                key={map}
                onClick={() => canInteract && handleAction(map)}
                disabled={!canInteract}
                className={cn(
                  "group relative overflow-hidden rounded-lg border-2 transition-all active:scale-95",
                  canInteract ? "border-gold/40" : "border-border",
                  isBanned && "opacity-50"
                )}
              >
                <div className="aspect-video w-full bg-navy">
                  <img src={`/images/maps/${map.toLowerCase()}.png`} alt={map} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="bg-surface p-2">
                  <p className="truncate font-display text-sm font-bold uppercase text-paper">{map}</p>
                </div>
                {action && (
                  <div className={cn("absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm", isBanned && "bg-red-900/90", isPicked && action.order !== 7 && "bg-green-900/90", action.order === 7 && "bg-gold/90")}>
                    {isBanned && (
                      <>
                        <X className="mb-2 h-10 w-10 text-red-300" />
                        <p className="px-2 text-center text-xs font-bold uppercase text-red-200">Banido</p>
                        <p className="px-2 text-center text-xs text-white">{teamName}</p>
                      </>
                    )}
                    {isPicked && action.order !== 7 && (
                      <>
                        <CheckCircle className="mb-2 h-10 w-10 text-green-300" />
                        <p className="px-2 text-center text-xs font-bold uppercase text-green-200">Escolhido</p>
                        <p className="px-2 text-center text-xs text-white">{teamName}</p>
                        {ctInfo && (
                          <p className="mt-1 px-2 text-center text-xs font-semibold text-blue-300">
                            🛡️ {ctInfo}
                          </p>
                        )}
                      </>
                    )}
                    {action.order === 7 && (
                      <>
                        <div className="mb-2 text-4xl">🏆</div>
                        <p className="font-display text-lg font-bold uppercase text-ink">DECIDER</p>
                        {ctInfo && (
                          <p className="mt-1 px-2 text-center text-xs font-bold text-ink/80">
                            🛡️ {ctInfo}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Resultado */}
        {session.status === "COMPLETED" && (
          <div className="card-ecl border-gold/50 bg-navy/80 p-4">
            <h2 className="mb-4 text-center font-display text-xl font-bold uppercase text-gold">
              ✅ Pick & Ban Concluído!
            </h2>
            <div className="mb-4 space-y-2">
              <div className="card-ecl p-3">
                <p className="mb-1 text-xs font-medium uppercase text-muted">Mapa 1 • {session.teamA.name}</p>
                <p className="font-display text-lg font-bold text-paper">{pickedMaps[0]?.map}</p>
                <p className="mt-1 text-xs font-semibold text-blue-400">
                  🛡️ {session.teamB.name} começa de CT
                </p>
              </div>
              <div className="card-ecl p-3">
                <p className="mb-1 text-xs font-medium uppercase text-muted">Mapa 2 • {session.teamB.name}</p>
                <p className="font-display text-lg font-bold text-paper">{pickedMaps[1]?.map}</p>
                <p className="mt-1 text-xs font-semibold text-blue-400">
                  🛡️ {session.teamA.name} começa de CT
                </p>
              </div>
              <div className="card-ecl border-gold bg-gold/10 p-3">
                <p className="mb-1 text-xs font-medium uppercase text-gold">🏆 Decider</p>
                <p className="font-display text-lg font-bold text-gold">{decider?.map}</p>
                <p className="mt-1 text-xs font-bold text-gold/80">
                  🛡️ Vencedor de {pickedMaps[0]?.map} começa de CT
                </p>
              </div>
            </div>
            <button
              onClick={copyResults}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-display text-base font-bold uppercase text-white transition-all active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                {resultsCopied ? <><Check className="h-5 w-5" />Copiado!</> : <><Copy className="h-5 w-5" />Copiar para WhatsApp</>}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
