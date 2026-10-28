'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Users, Activity, TrendingUp, UserPlus, UserX, Trash2,
  CheckCircle, XCircle, Shield, Link as LinkIcon, Clock,
  LogOut, RefreshCw, Circle, ChevronRight, Map, Ban,
  Star, Zap, BarChart3, Eye, Power, StopCircle
} from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003').replace(/\/$/, '');
const POLL_INTERVAL = 5000; // 5 segundos

export default function SuperAdminPage() {
  const router = useRouter();
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('metrics');
  const [metrics, setMetrics] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Auth ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkAuth();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Limpa mensagens após 4s
  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(''); setSuccess(''); }, 4000);
    return () => clearTimeout(t);
  }, [error, success]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || userRole !== 'SUPER_ADMIN') { router.push('/login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.user.role !== 'SUPER_ADMIN') { router.push('/login'); return; }
      await loadData();
      startPolling();
    } catch { router.push('/login'); }
  };

  // ─── Polling ─────────────────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      await silentRefresh();
    }, POLL_INTERVAL);
  }, []);

  const silentRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadMetrics(), loadAdmins(), loadSessions(), loadLogs()]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMetrics(), loadAdmins(), loadSessions(), loadLogs()]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  // ─── Loaders ─────────────────────────────────────────────────────────────────

  const getToken = () => localStorage.getItem('token');

  const loadMetrics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/super/metrics`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      setMetrics(await res.json());
    } catch { /* silencioso */ }
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/api/super/admins`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch { /* silencioso */ }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/super/sessions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* silencioso */ }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/super/logs?limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { /* silencioso */ }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleCreateAdmin = async () => {
    setError(''); setSuccess('');
    if (!newAdminUsername.trim() || !newAdminPassword) { setError('Preencha todos os campos'); return; }
    if (newAdminPassword.length < 6) { setError('Senha mínimo 6 caracteres'); return; }
    try {
      const res = await fetch(`${API_URL}/api/super/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ username: newAdminUsername.trim(), password: newAdminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setSuccess(`Admin "${newAdminUsername}" criado!`);
      setNewAdminUsername(''); setNewAdminPassword(''); setShowCreateAdmin(false);
      await silentRefresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleSuspendAdmin = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/super/admins/${id}/suspend`, {
        method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setSuccess('Admin suspenso');
      await silentRefresh();
    } catch { setError('Erro ao suspender'); }
  };

  const handleActivateAdmin = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/super/admins/${id}/activate`, {
        method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setSuccess('Admin reativado');
      await silentRefresh();
    } catch { setError('Erro ao reativar'); }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (!confirm(`Deletar "${username}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/super/admins/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setSuccess('Admin deletado');
      await silentRefresh();
    } catch { setError('Erro ao deletar'); }
  };

  const handleRevokeToken = async (id: string, username: string) => {
    if (!confirm(`Derrubar o login ativo de "${username}"?\nEle será desconectado imediatamente.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/super/admins/${id}/revoke-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuccess(data.message || `Login de "${username}" encerrado`);
      await silentRefresh();
    } catch { setError('Erro ao derrubar login'); }
  };

  const handleTerminateSession = async (id: string, teamA: string, teamB: string) => {
    if (!confirm(`Encerrar a sessão "${teamA} vs ${teamB}"?\nEla será finalizada imediatamente para todos os jogadores.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/super/sessions/${id}/terminate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuccess(data.message || 'Sessão encerrada');
      await silentRefresh();
    } catch { setError('Erro ao encerrar sessão'); }
  };

  const handleLogout = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    router.push('/login');
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const logActionLabel: Record<string, string> = {
    LOGIN: 'Fez login',
    CREATE_ADMIN: 'Criou um admin',
    SUSPEND_ADMIN: 'Suspendeu um admin',
    ACTIVATE_ADMIN: 'Reativou um admin',
    DELETE_ADMIN: 'Deletou um admin',
    CREATE_SESSION: 'Criou uma sessão',
  };

  const tabs = [
    { id: 'metrics',  label: 'Visão Geral', icon: BarChart3 },
    { id: 'admins',   label: 'Admins',      icon: Users },
    { id: 'sessions', label: 'Sessões',     icon: Map },
    { id: 'logs',     label: 'Logs',        icon: Activity },
  ];

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-[#f59e0b]/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[#f59e0b] animate-spin" />
            <Shield className="absolute inset-0 m-auto h-8 w-8 text-[#f59e0b]" />
          </div>
          <p className="text-gray-400 text-sm tracking-widest uppercase">Carregando painel</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050d1a] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="fixed inset-y-0 left-0 w-64 bg-[#0a192f] border-r border-white/5 flex flex-col z-40 hidden lg:flex">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[#f59e0b] uppercase">Super Admin</p>
              <p className="text-[11px] text-gray-500">Elite Champions League</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Status live */}
        <div className="p-4 border-t border-white/5">
          <div className="rounded-lg bg-[#112240] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Circle className={`h-2 w-2 fill-current ${isRefreshing ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`} />
              <span className="text-xs text-gray-400">
                {isRefreshing ? 'Atualizando...' : 'Live — 5s'}
              </span>
            </div>
            {lastUpdated && (
              <p className="text-[10px] text-gray-600">
                Última vez: {lastUpdated.toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="h-4 w-4" />Sair
          </button>
        </div>
      </div>

      {/* ── Mobile header ───────────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#0a192f]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#f59e0b]" />
          <span className="text-sm font-bold text-[#f59e0b] uppercase tracking-wider">Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className={`h-2 w-2 fill-current ${isRefreshing ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`} />
          <button onClick={handleLogout} className="p-2 text-red-400 hover:text-red-300">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile tabs ─────────────────────────────────────────────────────── */}
      <div className="lg:hidden flex overflow-x-auto gap-1 px-4 py-2 bg-[#0a192f]/50 border-b border-white/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#f59e0b] text-white'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <tab.icon className="h-3 w-3" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Alerts */}
          <div className="mb-6 space-y-2">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-top-2">
                <XCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-top-2">
                <CheckCircle className="h-4 w-4 shrink-0" />{success}
              </div>
            )}
          </div>

          {/* ── MÉTRICAS ────────────────────────────────────────────────────── */}
          {activeTab === 'metrics' && (
            <div className="space-y-8">
              {/* Page title */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
                    Visão Geral
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">Monitoramento em tempo real do sistema</p>
                </div>
                <button
                  onClick={silentRefresh}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {/* KPI Cards */}
              {metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sessões Ativas */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a192f] to-[#112240] border border-yellow-500/20 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-8 translate-x-8" />
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-yellow-400" />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        <Circle className="h-1.5 w-1.5 fill-current animate-pulse" />LIVE
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{metrics.sessions.inProgress}</p>
                    <p className="text-sm text-gray-500">Sessões Ativas</p>
                    <p className="mt-3 text-[10px] text-gray-600">
                      {lastUpdated ? `Atualizado ${lastUpdated.toLocaleTimeString('pt-BR')}` : '—'}
                    </p>
                  </div>

                  {/* Sessões Concluídas */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a192f] to-[#112240] border border-green-500/20 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-8 translate-x-8" />
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Concluídas</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{metrics.sessions.completed}</p>
                    <p className="text-sm text-gray-500">Sessões Concluídas</p>
                    <div className="mt-3 text-xs text-gray-600">
                      {metrics.sessions.total > 0
                        ? `${Math.round((metrics.sessions.completed / metrics.sessions.total) * 100)}% do total`
                        : '—'}
                    </div>
                  </div>

                  {/* Sessões Derrubadas */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a192f] to-[#112240] border border-red-500/20 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <StopCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Derrubadas</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{metrics.sessions.terminated ?? 0}</p>
                    <p className="text-sm text-gray-500">Sessões Derrubadas</p>
                    <div className="mt-3 text-xs text-red-500/60">
                      {(metrics.sessions.terminated ?? 0) > 0 ? 'Encerradas pelo Super Admin' : 'Nenhuma até o momento'}
                    </div>
                  </div>

                  {/* Admins */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a192f] to-[#112240] border border-white/5 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8" />
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Admins</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{metrics.admins.total}</p>
                    <p className="text-sm text-gray-500">Administradores</p>
                    <div className="mt-3 flex gap-3 text-xs">
                      <span className="flex items-center gap-1 text-green-400">
                        <Circle className="h-1.5 w-1.5 fill-current" />{metrics.admins.active} ativos
                      </span>
                      <span className="flex items-center gap-1 text-red-400">
                        <Circle className="h-1.5 w-1.5 fill-current" />{metrics.admins.suspended}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sessões recentes */}
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  Sessões Recentes
                </h2>
                <div className="rounded-2xl bg-[#0a192f] border border-white/5 overflow-hidden">
                  {sessions.slice(0, 5).length === 0 ? (
                    <div className="py-12 text-center text-gray-600">
                      <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma sessão ainda</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left text-xs text-gray-500 font-medium px-6 py-3">Partida</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-6 py-3 hidden sm:table-cell">Admin</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-6 py-3 hidden md:table-cell">Horário</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.slice(0, 5).map((s: any, i) => (
                          <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-white">{s.teamA} <span className="text-[#f59e0b]">vs</span> {s.teamB}</p>
                                {s.source === 'ECL' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                                    <LinkIcon className="h-2 w-2" />ECL
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{s.actions?.length || 0} ações{s.seriesFormat ? ` · ${s.seriesFormat}` : ''}</p>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <span className="text-xs text-gray-400">
                                {s.source === 'ECL' ? 'ECL Portal' : s.createdBy}
                              </span>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              <span className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleString('pt-BR')}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                s.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : s.status === 'TERMINATED' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                <Circle className="h-1.5 w-1.5 fill-current" />
                                {s.status === 'COMPLETED' ? 'Concluída' : s.status === 'TERMINATED' ? 'Derrubada' : 'Ativa'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Logs recentes */}
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  Atividade Recente
                </h2>
                <div className="rounded-2xl bg-[#0a192f] border border-white/5 overflow-hidden">
                  {logs.slice(0, 5).length === 0 ? (
                    <div className="py-12 text-center text-gray-600">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum log ainda</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {logs.slice(0, 5).map((log, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#f59e0b]">{log.username?.[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              <span className="text-[#f59e0b] font-medium">{log.username}</span>
                              {' '}{logActionLabel[log.action] || log.action}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ADMINS ──────────────────────────────────────────────────────── */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>Administradores</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{admins.length} admin{admins.length !== 1 ? 's' : ''} cadastrado{admins.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowCreateAdmin(!showCreateAdmin)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-semibold shadow-lg shadow-[#f59e0b]/20 transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Criar Admin</span>
                  <span className="sm:hidden">Criar</span>
                </button>
              </div>

              {/* Form criar */}
              {showCreateAdmin && (
                <div className="rounded-2xl bg-[#0a192f] border border-[#f59e0b]/20 p-6 space-y-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-[#f59e0b]" />Novo Administrador
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Usuário</label>
                      <input
                        type="text"
                        value={newAdminUsername}
                        onChange={e => setNewAdminUsername(e.target.value)}
                        placeholder="ex: Referee01"
                        className="w-full px-4 py-2.5 bg-[#112240] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:border-[#f59e0b]/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Senha (mín. 6 caracteres)</label>
                      <input
                        type="password"
                        value={newAdminPassword}
                        onChange={e => setNewAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#112240] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:border-[#f59e0b]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleCreateAdmin} className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors">
                      Criar
                    </button>
                    <button
                      onClick={() => { setShowCreateAdmin(false); setNewAdminUsername(''); setNewAdminPassword(''); setError(''); }}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista */}
              <div className="rounded-2xl bg-[#0a192f] border border-white/5 overflow-hidden">
                {admins.length === 0 ? (
                  <div className="py-16 text-center text-gray-600">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum admin cadastrado</p>
                    <p className="text-xs mt-1 text-gray-700">Crie o primeiro usando o botão acima</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {admins.map(admin => (
                      <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-5 hover:bg-white/2 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-[#f59e0b]">{admin.username[0]}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{admin.username}</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                admin.status === 'ACTIVE'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}>
                                <Circle className="h-1.5 w-1.5 fill-current" />
                                {admin.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Criado em {new Date(admin.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 ml-14 sm:ml-0">
                          {admin.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleSuspendAdmin(admin.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium transition-colors"
                            >
                              <UserX className="h-3.5 w-3.5" />Suspender
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateAdmin(admin.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />Reativar
                            </button>
                          )}
                          <button
                            onClick={() => handleRevokeToken(admin.id, admin.username)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium transition-colors"
                            title="Derruba o login ativo imediatamente"
                          >
                            <Power className="h-3.5 w-3.5" />Derrubar Login
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />Deletar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SESSÕES ─────────────────────────────────────────────────────── */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>Sessões</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} registrada{sessions.length !== 1 ? 's' : ''}
                  {' · '}
                  <span className="text-blue-400">{sessions.filter((s: any) => s.source === 'ECL').length} via ECL</span>
                  {' · '}
                  <span className="text-gray-400">{sessions.filter((s: any) => s.source !== 'ECL').length} manuais</span>
                </p>
              </div>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="rounded-2xl bg-[#0a192f] border border-white/5 py-16 text-center text-gray-600">
                    <Map className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma sessão criada ainda</p>
                  </div>
                ) : sessions.map((session: any) => (
                  <div key={session.id} className={`rounded-2xl bg-[#0a192f] border hover:border-white/10 transition-colors overflow-hidden ${
                    session.source === 'ECL' ? 'border-blue-500/20' : 'border-white/5'
                  }`}>
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-base font-bold text-white">
                              {session.teamA} <span className="text-[#f59e0b] font-normal">vs</span> {session.teamB}
                            </h3>

                            {/* Badge de origem */}
                            {session.source === 'ECL' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                                <LinkIcon className="h-2.5 w-2.5" />ECL
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-500 border border-white/10">
                                Manual
                              </span>
                            )}

                            {/* Badge de série */}
                            {session.seriesFormat && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                                {session.seriesFormat}
                              </span>
                            )}

                            {/* Badge de status */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              session.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : session.status === 'TERMINATED' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}>
                              <Circle className="h-1.5 w-1.5 fill-current" />
                              {session.status === 'COMPLETED' ? 'Concluída' : session.status === 'TERMINATED' ? 'Derrubada' : 'Em Andamento'}
                            </span>

                            {/* Botão encerrar */}
                            {session.status !== 'COMPLETED' && session.status !== 'TERMINATED' && (
                              <button
                                onClick={() => handleTerminateSession(session.id, session.teamA, session.teamB)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-colors"
                                title="Encerra a sessão imediatamente"
                              >
                                <StopCircle className="h-3 w-3" />Encerrar
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3 w-3" />
                              {session.source === 'ECL' ? 'Via ECL Portal' : session.createdBy}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />{new Date(session.createdAt).toLocaleString('pt-BR')}
                            </span>
                            {/* Link para a partida ECL */}
                            {session.matchId && (
                              <a
                                href={`https://ecl-official.vercel.app/matches/${session.matchId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <LinkIcon className="h-3 w-3" />Ver partida ECL
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {session.actions?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="flex flex-wrap gap-1.5">
                            {session.actions.map((action: any, idx: number) => (
                              <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                                action.action === 'BAN'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                                  : action.team === 'DECIDER'
                                  ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                                  : 'bg-green-500/10 text-green-400 border border-green-500/15'
                              }`}>
                                {action.action === 'BAN' ? <Ban className="h-2.5 w-2.5" /> : action.team === 'DECIDER' ? <Star className="h-2.5 w-2.5" /> : <CheckCircle className="h-2.5 w-2.5" />}
                                {action.map}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LOGS ────────────────────────────────────────────────────────── */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>Logs de Atividade</h1>
                <p className="text-sm text-gray-500 mt-0.5">{logs.length} registros mais recentes</p>
              </div>

              <div className="rounded-2xl bg-[#0a192f] border border-white/5 overflow-hidden">
                {logs.length === 0 ? (
                  <div className="py-16 text-center text-gray-600">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum log registrado</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-white/2 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-[#112240] border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-[#f59e0b]">{log.username?.[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold text-white">{log.username}</span>
                            {' '}<span className="text-gray-400">{logActionLabel[log.action] || log.action}</span>
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${
                          log.action === 'LOGIN' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                          log.action === 'CREATE_SESSION' ? 'text-green-400 border-green-500/20 bg-green-500/5' :
                          log.action === 'CREATE_ADMIN' ? 'text-[#f59e0b] border-[#f59e0b]/20 bg-[#f59e0b]/5' :
                          log.action.includes('SUSPEND') ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' :
                          log.action.includes('DELETE') ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                          'text-gray-400 border-white/10 bg-white/5'
                        }`}>
                          {log.action}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
