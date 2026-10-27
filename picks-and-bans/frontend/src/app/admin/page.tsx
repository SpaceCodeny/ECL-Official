"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Copy, Check, ExternalLink, ArrowLeft, Search, LogOut } from "lucide-react";
import { createSession, getTeams, Team } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  // Team A
  const [teamASelected, setTeamASelected] = useState<Team | null>(null);
  const [teamACustomName, setTeamACustomName] = useState("");
  const [showTeamAList, setShowTeamAList] = useState(false);
  const [teamASearch, setTeamASearch] = useState("");
  
  // Team B
  const [teamBSelected, setTeamBSelected] = useState<Team | null>(null);
  const [teamBCustomName, setTeamBCustomName] = useState("");
  const [showTeamBList, setShowTeamBList] = useState(false);
  const [teamBSearch, setTeamBSearch] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTeams();
    }
  }, [isAuthenticated]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003').replace(/\/$/, '');
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        router.push('/login');
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.push('/login');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    router.push('/login');
  };

  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Erro ao carregar times:", error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const [seriesFormat, setSeriesFormat] = useState<'BO1' | 'BO3' | 'BO5' | ''>('');

  const filteredTeamsA = teams.filter(t => 
    t.name.toLowerCase().includes(teamASearch.toLowerCase()) ||
    t.tag.toLowerCase().includes(teamASearch.toLowerCase())
  );

  const filteredTeamsB = teams.filter(t => 
    t.name.toLowerCase().includes(teamBSearch.toLowerCase()) ||
    t.tag.toLowerCase().includes(teamBSearch.toLowerCase())
  );

  const getTeamAName = () => teamASelected?.name || teamACustomName.trim();
  const getTeamBName = () => teamBSelected?.name || teamBCustomName.trim();

  const handleCreateSession = async () => {
    const nameA = getTeamAName();
    const nameB = getTeamBName();

    if (!nameA || !nameB) {
      alert("Selecione ou digite o nome de ambos os times!");
      return;
    }

    if (nameA.toLowerCase() === nameB.toLowerCase()) {
      alert("Os times devem ter nomes diferentes!");
      return;
    }

    if (!seriesFormat) {
      alert("Selecione o formato da série (BO1, BO3 ou BO5)!");
      return;
    }

    setLoading(true);

    try {
      const response = await createSession(
        nameA,
        nameB,
        teamASelected?.logoUrl,
        teamBSelected?.logoUrl,
        teamASelected?.tag,
        teamBSelected?.tag,
        seriesFormat
      );
      const link = `${window.location.origin}/session/${response.sessionId}`;
      setGeneratedLink(link);
      setSessionId(response.sessionId);
    } catch (error) {
      alert("Erro ao criar sessão. Verifique se o servidor está rodando.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Erro ao copiar link!");
    }
  };

  const openSession = () => {
    window.open(generatedLink, "_blank");
  };

  const createNewSession = () => {
    setGeneratedLink("");
    setSessionId("");
    setTeamASelected(null);
    setTeamACustomName("");
    setTeamASearch("");
    setTeamBSelected(null);
    setTeamBCustomName("");
    setTeamBSearch("");
    setSeriesFormat("");
    setCopied(false);
  };

  // Loading de autenticação
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
          <p className="text-muted">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, não renderizar nada (vai redirecionar)
  if (!isAuthenticated) {
    return null;
  }

  // Tela de link gerado
  if (generatedLink) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink via-navy to-ink p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-6 text-center sm:mb-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 sm:mb-4 sm:h-16 sm:w-16">
              <Check className="h-6 w-6 text-green-400 sm:h-8 sm:w-8" />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold uppercase tracking-tight text-paper sm:text-3xl lg:text-4xl">
              Sessão Criada com Sucesso!
            </h1>
            <p className="text-sm text-muted sm:text-base">Compartilhe o link abaixo com os líderes dos times</p>
          </div>

          {/* Times */}
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-4 sm:mb-6 sm:gap-4 sm:p-6">
            <div className="text-center">
              <p className="mb-1.5 text-xs text-muted sm:mb-2 sm:text-sm">Time A</p>
              {teamASelected?.logoUrl && (
                <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center sm:mb-2 sm:h-12 sm:w-12">
                  <img src={teamASelected.logoUrl} alt={getTeamAName()} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <p className="font-display text-lg font-bold text-gold sm:text-xl lg:text-2xl">{getTeamAName()}</p>
              <p className="text-xs text-muted">{teamASelected?.tag || getTeamAName().substring(0, 4).toUpperCase()}</p>
            </div>
            <div className="text-center">
              <p className="mb-1.5 text-xs text-muted sm:mb-2 sm:text-sm">Time B</p>
              {teamBSelected?.logoUrl && (
                <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center sm:mb-2 sm:h-12 sm:w-12">
                  <img src={teamBSelected.logoUrl} alt={getTeamBName()} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <p className="font-display text-lg font-bold text-gold sm:text-xl lg:text-2xl">{getTeamBName()}</p>
              <p className="text-xs text-muted">{teamBSelected?.tag || getTeamBName().substring(0, 4).toUpperCase()}</p>
            </div>
          </div>

          {/* Link */}
          <div className="mb-4 space-y-2 rounded-lg border border-border bg-surface p-4 sm:mb-6 sm:space-y-3 sm:p-6">
            <label className="block text-xs font-medium text-paper sm:text-sm">🔗 Link da Sessão</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-1 rounded-lg border border-border bg-ink px-3 py-2 font-mono text-xs text-paper focus:outline-none sm:px-4 sm:py-3 sm:text-sm"
              />
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2 font-bold text-ink transition-all hover:bg-gold-light sm:px-6 sm:py-3"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-sm sm:text-base">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-sm sm:text-base">Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instruções */}
          <div className="mb-4 space-y-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 sm:mb-6 sm:space-y-4 sm:p-6">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-blue-300 sm:text-lg">
              📋 Instruções para os Times
            </h3>
            <ul className="space-y-1.5 text-xs text-blue-200 sm:space-y-2 sm:text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-gold sm:mt-1">•</span>
                <span>Compartilhe este link com os líderes de ambos os times</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-gold sm:mt-1">•</span>
                <span>Ambos devem acessar o <strong>mesmo link</strong> para participar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-gold sm:mt-1">•</span>
                <span>Cada time realiza suas ações quando for sua vez</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-gold sm:mt-1">•</span>
                <span>As escolhas são salvas automaticamente no navegador</span>
              </li>
            </ul>
          </div>

          {/* Ordem do Pick & Ban */}
          <div className="mb-4 rounded-lg border border-gold/20 bg-gold/5 p-4 sm:mb-6 sm:p-6">
            <p className="mb-2 text-xs font-medium text-gold sm:mb-3 sm:text-sm">Ordem do Pick & Ban:</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200 sm:px-3 sm:py-1.5 sm:text-sm">A BAN</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200 sm:px-3 sm:py-1.5 sm:text-sm">B BAN</span>
              <span className="rounded bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200 sm:px-3 sm:py-1.5 sm:text-sm">A PICK</span>
              <span className="rounded bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200 sm:px-3 sm:py-1.5 sm:text-sm">B PICK</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200 sm:px-3 sm:py-1.5 sm:text-sm">B BAN</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200 sm:px-3 sm:py-1.5 sm:text-sm">A BAN</span>
              <span className="rounded bg-gold/50 px-2 py-1 text-xs font-bold text-gold sm:px-3 sm:py-1.5 sm:text-sm">DECIDER</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={openSession}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-display text-base font-bold uppercase tracking-wide text-ink transition-all hover:bg-gold-light sm:px-6 sm:py-4 sm:text-lg"
            >
              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
              Abrir Sessão
            </button>
            <button
              onClick={createNewSession}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 font-display text-base font-bold uppercase tracking-wide text-paper transition-all hover:bg-surface/80 sm:px-6 sm:py-4 sm:text-lg"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              Nova Sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de criação
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink via-navy to-ink p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold uppercase tracking-tight text-paper sm:mb-2 sm:text-3xl lg:text-4xl">
              Criar Sessão de Pick & Ban
            </h1>
            <p className="text-xs text-muted sm:text-sm">Selecione times cadastrados ou digite nomes manualmente</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 font-medium text-paper transition-all hover:bg-surface/80 sm:justify-start"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:space-y-6 sm:p-6">
          {/* Time A */}
          <div>
            <label className="mb-2 block text-sm font-medium text-paper sm:mb-3">
              <Users className="mb-1 inline h-4 w-4" /> Time A
            </label>
            
            {teamASelected ? (
              <div className="flex items-center justify-between rounded-lg border-2 border-gold bg-gold/10 p-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  {teamASelected.logoUrl && (
                    <div className="relative h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10">
                      <img src={teamASelected.logoUrl} alt={teamASelected.name} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-paper sm:text-base">{teamASelected.name}</p>
                    <p className="text-xs text-muted">{teamASelected.tag}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTeamASelected(null)}
                  className="ml-2 flex-shrink-0 rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 sm:px-3 sm:text-sm"
                >
                  Remover
                </button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex gap-2">
                  <button
                    onClick={() => setShowTeamAList(!showTeamAList)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-ink px-4 py-3 font-medium text-paper hover:bg-ink/80"
                  >
                    <Search className="h-4 w-4" />
                    Selecionar Time Cadastrado
                  </button>
                </div>
                
                {showTeamAList && (
                  <div className="mb-3 rounded-lg border border-border bg-ink p-3">
                    <input
                      type="text"
                      value={teamASearch}
                      onChange={(e) => setTeamASearch(e.target.value)}
                      placeholder="Buscar time..."
                      className="mb-3 w-full rounded border border-border bg-navy px-3 py-2 text-sm text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
                    />
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {loadingTeams ? (
                        <p className="py-4 text-center text-sm text-muted">Carregando times...</p>
                      ) : filteredTeamsA.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted">Nenhum time encontrado</p>
                      ) : (
                        filteredTeamsA.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => {
                              setTeamASelected(team);
                              setShowTeamAList(false);
                              setTeamASearch("");
                            }}
                            className="flex w-full items-center gap-3 rounded border border-border bg-surface p-2 text-left hover:border-gold hover:bg-surface/80"
                          >
                            {team.logoUrl && (
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                                <img src={team.logoUrl} alt={team.name} className="max-h-full max-w-full object-contain" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-paper">{team.name}</p>
                              <p className="text-xs text-muted">{team.tag}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface px-2 text-muted">ou</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={teamACustomName}
                  onChange={(e) => setTeamACustomName(e.target.value)}
                  placeholder="Digite o nome do time manualmente"
                  className="w-full rounded-lg border border-border bg-ink px-4 py-3 text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
                />
              </>
            )}
          </div>

          {/* Time B */}
          <div>
            <label className="mb-3 block text-sm font-medium text-paper">
              <Users className="mb-1 inline h-4 w-4" /> Time B
            </label>
            
            {teamBSelected ? (
              <div className="flex items-center justify-between rounded-lg border-2 border-gold bg-gold/10 p-3">
                <div className="flex items-center gap-3">
                  {teamBSelected.logoUrl && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                      <img src={teamBSelected.logoUrl} alt={teamBSelected.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-paper">{teamBSelected.name}</p>
                    <p className="text-xs text-muted">{teamBSelected.tag}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTeamBSelected(null)}
                  className="rounded bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400 hover:bg-red-500/30"
                >
                  Remover
                </button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex gap-2">
                  <button
                    onClick={() => setShowTeamBList(!showTeamBList)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-ink px-4 py-3 font-medium text-paper hover:bg-ink/80"
                  >
                    <Search className="h-4 w-4" />
                    Selecionar Time Cadastrado
                  </button>
                </div>
                
                {showTeamBList && (
                  <div className="mb-3 rounded-lg border border-border bg-ink p-3">
                    <input
                      type="text"
                      value={teamBSearch}
                      onChange={(e) => setTeamBSearch(e.target.value)}
                      placeholder="Buscar time..."
                      className="mb-3 w-full rounded border border-border bg-navy px-3 py-2 text-sm text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
                    />
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {loadingTeams ? (
                        <p className="py-4 text-center text-sm text-muted">Carregando times...</p>
                      ) : filteredTeamsB.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted">Nenhum time encontrado</p>
                      ) : (
                        filteredTeamsB.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => {
                              setTeamBSelected(team);
                              setShowTeamBList(false);
                              setTeamBSearch("");
                            }}
                            className="flex w-full items-center gap-3 rounded border border-border bg-surface p-2 text-left hover:border-gold hover:bg-surface/80"
                          >
                            {team.logoUrl && (
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                                <img src={team.logoUrl} alt={team.name} className="max-h-full max-w-full object-contain" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-paper">{team.name}</p>
                              <p className="text-xs text-muted">{team.tag}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface px-2 text-muted">ou</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={teamBCustomName}
                  onChange={(e) => setTeamBCustomName(e.target.value)}
                  placeholder="Digite o nome do time manualmente"
                  className="w-full rounded-lg border border-border bg-ink px-4 py-3 text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
                />
              </>
            )}
          </div>

          {/* Formato da Série */}
          <div>
            <label className="mb-3 block text-sm font-medium text-paper">
              Formato da Série <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { id: 'BO1', label: 'BO1', desc: 'Melhor de 1', detail: '6 bans → Decider' },
                { id: 'BO3', label: 'BO3', desc: 'Melhor de 3', detail: '2 bans, 2 picks, 2 bans → Decider' },
                { id: 'BO5', label: 'BO5', desc: 'Melhor de 5', detail: '2 picks, 2 bans, 2 picks → Decider' },
              ] as const).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSeriesFormat(fmt.id)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    seriesFormat === fmt.id
                      ? 'border-gold bg-gold/10 shadow-lg shadow-gold/20'
                      : 'border-border bg-ink hover:border-gold/50'
                  }`}
                >
                  <p className={`text-lg font-black uppercase ${seriesFormat === fmt.id ? 'text-gold' : 'text-paper'}`}>
                    {fmt.label}
                  </p>
                  <p className="text-xs font-medium text-muted">{fmt.desc}</p>
                  <p className="mt-1 hidden text-[10px] text-muted/60 sm:block">{fmt.detail}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={loading || (!getTeamAName() || !getTeamBName()) || !seriesFormat}
            className="w-full rounded-lg bg-gold px-4 py-3 font-display text-base font-bold uppercase tracking-wide text-ink transition-all hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-4 sm:text-lg"
          >
            {loading ? (
              "Criando..."
            ) : (
              <>
                <Plus className="mr-2 inline h-4 w-4 sm:h-5 sm:w-5" />
                Gerar Link da Sessão
              </>
            )}
          </button>
        </div>

        {/* Informações */}
        <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 sm:p-4">
            <p className="text-xs text-gold sm:text-sm">
              <strong>💡 Como funciona:</strong> Você pode selecionar times já cadastrados na ECL ou criar uma sessão com nomes personalizados.
              O Pick & Ban acontecerá em tempo real seguindo a ordem:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">A BAN</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">B BAN</span>
              <span className="rounded bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200">A PICK</span>
              <span className="rounded bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200">B PICK</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">B BAN</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">A BAN</span>
              <span className="rounded bg-gold/50 px-2 py-1 text-xs font-bold text-gold">DECIDER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
