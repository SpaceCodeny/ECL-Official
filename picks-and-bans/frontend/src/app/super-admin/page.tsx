'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Activity, TrendingUp, UserPlus, UserX, Trash2,
  CheckCircle, XCircle, Shield, Link as LinkIcon, Clock, LogOut
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('metrics');
  const [metrics, setMetrics] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || userRole !== 'SUPER_ADMIN') { router.push('/login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.user.role !== 'SUPER_ADMIN') { router.push('/login'); return; }
      await loadData();
    } catch { router.push('/login'); }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMetrics(), loadAdmins(), loadSessions(), loadLogs()]);
    setLoading(false);
  };

  const loadMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/metrics`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMetrics(data);
    } catch {
      setMetrics({ sessions: { total: 0, completed: 0, inProgress: 0 }, admins: { total: 0, active: 0, suspended: 0 }, logs: 0 });
    }
  };

  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/admins`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch { setAdmins([]); }
  };

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { setSessions([]); }
  };

  const loadLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/logs?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { setLogs([]); }
  };

  const handleCreateAdmin = async () => {
    setError(''); setSuccess('');
    if (!newAdminUsername || !newAdminPassword) { setError('Preencha todos os campos'); return; }
    if (newAdminPassword.length < 6) { setError('Senha mínimo 6 caracteres'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setSuccess(`Admin "${newAdminUsername}" criado com sucesso!`);
      setNewAdminUsername(''); setNewAdminPassword(''); setShowCreateAdmin(false);
      await loadAdmins(); await loadMetrics();
    } catch (e: any) { setError(e.message); }
  };

  const handleSuspendAdmin = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/admins/${id}/suspend`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setSuccess('Admin suspenso com sucesso');
      await loadAdmins(); await loadMetrics();
    } catch { setError('Erro ao suspender admin'); }
  };

  const handleActivateAdmin = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/admins/${id}/activate`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setSuccess('Admin reativado com sucesso');
      await loadAdmins(); await loadMetrics();
    } catch { setError('Erro ao reativar admin'); }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (!confirm(`Deletar o admin "${username}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/super/admins/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setSuccess('Admin deletado com sucesso');
      await loadAdmins(); await loadMetrics();
    } catch { setError('Erro ao deletar admin'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#0a192f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f59e0b] mx-auto mb-4" />
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#0a192f]">

      {/* Header */}
      <div className="bg-[#112240]/80 backdrop-blur-sm border-b border-[#f59e0b]/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#f59e0b]" />
            <div>
              <h1 className="text-2xl font-bold text-white uppercase" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Super Admin
              </h1>
              <p className="text-sm text-gray-400">Elite Champions League</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-7xl mx-auto px-4">
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircle className="h-5 w-5 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 shrink-0" />{success}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'metrics', label: 'Métricas', icon: TrendingUp },
            { id: 'admins', label: 'Admins', icon: Users },
            { id: 'sessions', label: 'Sessões', icon: LinkIcon },
            { id: 'logs', label: 'Logs', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#f59e0b] text-white shadow-lg'
                  : 'bg-[#112240] text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* MÉTRICAS */}
        {activeTab === 'metrics' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#112240]/80 rounded-xl p-6 border border-[#f59e0b]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Sessões</h3>
                <LinkIcon className="h-8 w-8 text-[#f59e0b]" />
              </div>
              <p className="text-4xl font-bold text-white mb-2">{metrics.sessions.total}</p>
              <div className="text-sm space-y-1">
                <div className="text-green-400">✓ {metrics.sessions.completed} completas</div>
                <div className="text-yellow-400">⏳ {metrics.sessions.inProgress} ativas</div>
              </div>
            </div>

            <div className="bg-[#112240]/80 rounded-xl p-6 border border-[#f59e0b]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Admins</h3>
                <Users className="h-8 w-8 text-[#f59e0b]" />
              </div>
              <p className="text-4xl font-bold text-white mb-2">{metrics.admins.total}</p>
              <div className="text-sm space-y-1">
                <div className="text-green-400">✓ {metrics.admins.active} ativos</div>
                <div className="text-red-400">✗ {metrics.admins.suspended} suspensos</div>
              </div>
            </div>

            <div className="bg-[#112240]/80 rounded-xl p-6 border border-[#f59e0b]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Logs</h3>
                <Activity className="h-8 w-8 text-[#f59e0b]" />
              </div>
              <p className="text-4xl font-bold text-white mb-2">{metrics.logs}</p>
              <p className="text-sm text-gray-400">Atividades registradas</p>
            </div>
          </div>
        )}

        {/* ADMINS */}
        {activeTab === 'admins' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Administradores</h2>
              <button
                onClick={() => setShowCreateAdmin(!showCreateAdmin)}
                className="flex items-center gap-2 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg transition-colors"
              >
                <UserPlus className="h-4 w-4" />Criar Admin
              </button>
            </div>

            {showCreateAdmin && (
              <div className="bg-[#112240]/80 rounded-xl p-6 border border-[#f59e0b]/20 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Novo Administrador</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Usuário</label>
                    <input
                      type="text"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      placeholder="ex: NomeAdmin"
                      className="w-full px-4 py-2 bg-[#0a192f] border border-gray-700 rounded-lg text-white focus:border-[#f59e0b] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Senha (mín. 6 caracteres)</label>
                    <input
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-2 bg-[#0a192f] border border-gray-700 rounded-lg text-white focus:border-[#f59e0b] outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateAdmin} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                      Criar
                    </button>
                    <button
                      onClick={() => { setShowCreateAdmin(false); setNewAdminUsername(''); setNewAdminPassword(''); setError(''); }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {admins.map((admin) => (
                <div key={admin.id} className="bg-[#112240]/80 rounded-xl p-6 border border-[#f59e0b]/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{admin.username}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          admin.status === 'ACTIVE'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {admin.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Criado em {new Date(admin.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {admin.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleSuspendAdmin(admin.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
                        >
                          <UserX className="h-4 w-4" />Suspender
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateAdmin(admin.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />Reativar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />Deletar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {admins.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhum admin cadastrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SESSÕES */}
        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Histórico de Sessões</h2>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="bg-[#112240]/80 rounded-xl p-6 border border-[#f59e0b]/20">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-white">{session.teamA} vs {session.teamB}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        session.status === 'COMPLETED'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {session.status === 'COMPLETED' ? 'Completa' : 'Em Andamento'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />Admin: {session.createdBy}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />{new Date(session.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    {session.actions?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-2">Ações:</p>
                        <div className="flex flex-wrap gap-2">
                          {session.actions.map((action: any, idx: number) => (
                            <span key={idx} className={`px-3 py-1 rounded-full text-xs font-medium ${
                              action.action === 'BAN'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : idx === 6
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                              {action.action === 'BAN' ? '🚫' : idx === 6 ? '⭐' : '✓'} {action.map}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <LinkIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sessão criada ainda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGS */}
        {activeTab === 'logs' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Logs de Atividade (50 recentes)</h2>
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="bg-[#112240]/80 rounded-lg p-4 border border-[#f59e0b]/10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="text-xs text-gray-500 sm:w-44 shrink-0">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-sm font-semibold text-[#f59e0b]">{log.username}</span>
                    <span className="text-sm text-gray-300">{log.action}</span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhum log registrado</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
