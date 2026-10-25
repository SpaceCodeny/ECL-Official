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

        // Iniciar polling a cada 2 segundos
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

  const handleReset = async () => {
    if (!confirm("Deseja resetar a sessão?")) return;
    try {
      await apiResetSession(id);
    } catch (error) {
      alert("Erro ao resetar sessão");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!selectedTeam || !leaderNick) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink via-navy to-ink flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/20">
              <User className="h-8 w-8 text-gold" />
            </div>
            <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-tight text-paper">
              Entrar na Sessão
            </h1>
            <p className="text-muted">Digite seu nickname e selecione seu time</p>
          </div>

          <div className="mb-8">
            <label className="mb-3 block text-center text-sm font-medium text-paper">
              Seu Nickname (apelido)
            </label>
            <input
              type="text"
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="Ex: Player123"
              maxLength={20}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-center text-lg font-medium text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <button
              onClick={() => selectTeamWithNick("A")}
              disabled={!inputNick.trim()}
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-surface p-8 transition-all hover:border-gold hover:shadow-2xl hover:shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20 transition-all group-hover:bg-purple-500/30">
                  <span className="font-display text-3xl font-bold text-purple-400">
                    {session?.teamA.tag || "A"}
                  </span>
                </div>
                <h2 className="mb-2 font-display text-3xl font-bold uppercase text-paper">
                  {session?.teamA.name || "Time A"}
                </h2>
                <p className="text-sm text-muted">Clique para representar o Time A</p>
                {session?.teamA.leader && (
                  <p className="mt-2 text-xs text-gold">Líder: {session.teamA.leader}</p>
                )}
              </div>
            </button>

            <button
              onClick={() => selectTeamWithNick("B")}
              disabled={!inputNick.trim()}
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-surface p-8 transition-all hover:border-gold hover:shadow-2xl hover:shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-pink-500/20 transition-all group-hover:bg-pink-500/30">
                  <span className="font-display text-3xl font-bold text-pink-400">
                    {session?.teamB.tag || "B"}
                  </span>
                </div>
                <h2 className="mb-2 font-display text-3xl font-bold uppercase text-paper">
                  {session?.teamB.name || "Time B"}
                </h2>
                <p className="text-sm text-muted">Clique para representar o Time B</p>
                {session?.teamB.leader && (
                  <p className="mt-2 text-xs text-gold">Líder: {session.teamB.leader}</p>
                )}
              </div>
            </button>
          </div>

          <div className="mt-8 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-center">
            <p className="text-sm text-blue-200">
              💡 <strong>Dica:</strong> As ações serão sincronizadas em tempo real!
            </p>
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
    <div className="min-h-screen bg-gradient-to-b from-ink via-navy to-ink p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-tight text-paper">
              Pick & Ban Session
            </h1>
            <p className="text-sm text-muted">
              Você: <span className="font-bold text-gold">{leaderNick}</span> • Time:{" "}
              <span className={cn("font-bold", selectedTeam === "A" ? "text-purple-400" : "text-pink-400")}>
                {selectedTeam === "A" ? session.teamA.name : session.teamB.name}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className="rounded-lg border border-border bg-surface px-4 py-2 font-display text-sm font-bold uppercase text-paper transition-all hover:border-gold">
              {copied ? <Check className="mr-2 inline h-4 w-4" /> : <Copy className="mr-2 inline h-4 w-4" />}
              {copied ? "Copiado!" : "Link"}
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border bg-surface px-4 py-2 font-display text-sm font-bold uppercase text-paper transition-all hover:border-gold">
              <RefreshCw className="mr-2 inline h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Times */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className={cn("rounded-lg border p-4 relative", session.currentTurn === "A" && session.status === "IN_PROGRESS" ? "border-gold bg-gold/10" : "border-border bg-surface", selectedTeam === "A" && "ring-2 ring-purple-500/50")}>
            {selectedTeam === "A" && <div className="absolute -top-2 -right-2 rounded-full bg-purple-500 px-2 py-1 text-xs font-bold text-white">Você</div>}
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Time A</p>
            <p className="font-display text-2xl font-bold uppercase text-paper">{session.teamA.name}</p>
            <p className="text-sm text-gold">{session.teamA.tag}</p>
            {session.teamA.leader && <p className="mt-1 text-xs text-muted">Líder: {session.teamA.leader}</p>}
            {session.currentTurn === "A" && session.status === "IN_PROGRESS" && (
              <p className="mt-2 text-sm font-medium text-gold">
                👉 Vez de {session.currentAction === "BAN" ? "BANIR" : "ESCOLHER"}
              </p>
            )}
          </div>

          <div className={cn("rounded-lg border p-4 relative", session.currentTurn === "B" && session.status === "IN_PROGRESS" ? "border-gold bg-gold/10" : "border-border bg-surface", selectedTeam === "B" && "ring-2 ring-pink-500/50")}>
            {selectedTeam === "B" && <div className="absolute -top-2 -right-2 rounded-full bg-pink-500 px-2 py-1 text-xs font-bold text-white">Você</div>}
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Time B</p>
            <p className="font-display text-2xl font-bold uppercase text-paper">{session.teamB.name}</p>
            <p className="text-sm text-gold">{session.teamB.tag}</p>
            {session.teamB.leader && <p className="mt-1 text-xs text-muted">Líder: {session.teamB.leader}</p>}
            {session.currentTurn === "B" && session.status === "IN_PROGRESS" && (
              <p className="mt-2 text-sm font-medium text-gold">
                👉 Vez de {session.currentAction === "BAN" ? "BANIR" : "ESCOLHER"}
              </p>
            )}
          </div>
        </div>

        {/* Mapas */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {MAPS.map((map) => {
            const action = session.actions.find((a) => a.map === map);
            const isAvailable = !usedMaps.includes(map);
            const isBanned = action?.action === "BAN";
            const isPicked = action?.action === "PICK";

            return (
              <button
                key={map}
                onClick={() => isAvailable && handleAction(map)}
                disabled={!isAvailable || session.status !== "IN_PROGRESS"}
                className={cn("group relative overflow-hidden rounded-lg border transition-all", isAvailable && session.status === "IN_PROGRESS" ? "border-gold/40 hover:border-gold hover:shadow-lg hover:shadow-gold/20 cursor-pointer" : "border-border cursor-not-allowed", isBanned && "opacity-30")}
              >
                <div className="aspect-video w-full overflow-hidden bg-surface">
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-110"
                    style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(/images/maps/${map.toLowerCase()}.png)`, backgroundColor: "#1A1F28" }}
                  />
                </div>
                <div className="p-3">
                  <p className="font-display text-lg font-bold uppercase text-paper">{map}</p>
                </div>
                {action && (
                  <div className={cn("absolute inset-0 flex items-center justify-center", isBanned && "bg-red-900/80", isPicked && "bg-green-900/80")}>
                    {isBanned && (
                      <div className="text-center">
                        <X className="mx-auto h-12 w-12 text-red-400" />
                        <p className="mt-2 font-display text-sm font-bold uppercase text-red-200">Banned by Team {action.team}</p>
                      </div>
                    )}
                    {isPicked && action.order !== 7 && (
                      <div className="text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                        <p className="mt-2 font-display text-sm font-bold uppercase text-green-200">Picked by Team {action.team}</p>
                      </div>
                    )}
                    {action.order === 7 && (
                      <div className="text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-gold" />
                        <p className="mt-2 font-display text-sm font-bold uppercase text-gold">DECIDER</p>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Resultado */}
        {session.status === "COMPLETED" && (
          <div className="rounded-lg border border-gold bg-gold/10 p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">✅ Pick & Ban Completo!</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-2 text-sm uppercase text-muted">Mapa 1 (Team A Pick)</p>
                <p className="font-display text-xl font-bold text-paper">{pickedMaps[0]?.map}</p>
              </div>
              <div>
                <p className="mb-2 text-sm uppercase text-muted">Mapa 2 (Team B Pick)</p>
                <p className="font-display text-xl font-bold text-paper">{pickedMaps[1]?.map}</p>
              </div>
              <div>
                <p className="mb-2 text-sm uppercase text-gold">🏆 Decider</p>
                <p className="font-display text-xl font-bold text-gold">{decider?.map}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
