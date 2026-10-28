const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('./prisma/client');

// Carregar dotenv apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  require('dotenv').config();
}

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3002',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// ==================== CONSTANTES ====================

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production-urgently';

const MAPS = ['Breeze', 'Dune', 'Hanami', 'Prision', 'Province', 'Rust', 'Sandstone'];

// Sequências por formato de série
const SEQUENCES = {
  // BO1: 6 bans (todos baniam), o último mapa que sobra é o decider
  BO1: [
    { team: 'A', action: 'BAN' },
    { team: 'B', action: 'BAN' },
    { team: 'A', action: 'BAN' },
    { team: 'B', action: 'BAN' },
    { team: 'A', action: 'BAN' },
    { team: 'B', action: 'BAN' },
  ],
  // BO3: 2 bans, 2 picks, 2 bans → 1 decider
  BO3: [
    { team: 'A', action: 'BAN' },
    { team: 'B', action: 'BAN' },
    { team: 'A', action: 'PICK' },
    { team: 'B', action: 'PICK' },
    { team: 'B', action: 'BAN' },
    { team: 'A', action: 'BAN' },
  ],
  // BO5: 2 picks, 2 bans, 2 picks → 1 decider
  BO5: [
    { team: 'A', action: 'PICK' },
    { team: 'B', action: 'PICK' },
    { team: 'A', action: 'BAN' },
    { team: 'B', action: 'BAN' },
    { team: 'A', action: 'PICK' },
    { team: 'B', action: 'PICK' },
  ],
};

// Helper para obter a sequência de uma sessão
function getSequence(seriesFormat) {
  return SEQUENCES[seriesFormat] || SEQUENCES.BO3;
}

// Notificar o backend ECL quando uma sessão de picks/bans for concluída
async function notifyECLMatchComplete(session, actions) {
  if (!session.matchId) return; // Sessão não veio do ECL

  const ECL_API_URL = process.env.ECL_API_URL || 'https://ecl-backend-six.vercel.app';
  const ECL_WEBHOOK_SECRET = process.env.ECL_WEBHOOK_SECRET || 'ecl-picks-bans-webhook-secret';
  const ECL_FRONTEND_URL = process.env.ECL_FRONTEND_URL || 'https://ecl-official.vercel.app';

  // Converter ações do picks-and-bans para o formato MatchMap da ECL
  // Picks & Bans: BAN → ECL: BANNED | PICK → ECL: PICKED | DECIDER → ECL: DECIDER
  const maps = actions.map((action, idx) => {
    const eclAction = action.action === 'BAN' ? 'BANNED'
      : action.team === 'DECIDER' ? 'DECIDER'
      : 'PICKED';

    // actionTeamId: no ECL usamos o ID do time, mas aqui só temos 'A' ou 'B'
    // O backend ECL vai receber teamSide ('A'/'B') e resolver no próprio endpoint
    return {
      mapName: action.map,
      order: idx + 1,
      action: eclAction,
      actionTeamSide: action.team === 'DECIDER' ? null : action.team, // 'A', 'B' ou null
    };
  });

  const payload = {
    matchId: session.matchId,
    sessionId: session.id,
    maps,
  };

  try {
    const response = await fetch(`${ECL_API_URL}/api/v1/matches/${session.matchId}/picks-bans-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-picks-bans-secret': ECL_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Webhook ECL falhou (${response.status}): ${err}`);
    } else {
      console.log(`✅ Webhook ECL enviado para partida ${session.matchId}`);
    }
  } catch (error) {
    console.error('Erro ao enviar webhook ECL:', error);
  }
}

// Helper para formatar sessão para o frontend
function formatSession(session) {
  const sequence = getSequence(session.seriesFormat);
  let currentTurn = sequence[0].team;
  let currentAction = sequence[0].action;

  if (session.status === 'IN_PROGRESS' && session.actions.length < sequence.length) {
    const nextIndex = session.actions.length;
    currentTurn = sequence[nextIndex].team;
    currentAction = sequence[nextIndex].action;
  }

  return {
    id: session.id,
    teamA: {
      id: 'A',
      name: session.teamAName,
      tag: session.teamATag,
      logoUrl: session.teamALogo,
      leader: session.teamALeader,
    },
    teamB: {
      id: 'B',
      name: session.teamBName,
      tag: session.teamBTag,
      logoUrl: session.teamBLogo,
      leader: session.teamBLeader,
    },
    actions: session.actions || [],
    currentTurn,
    currentAction,
    seriesFormat: session.seriesFormat,
    status: session.status,
    createdAt: session.createdAt,
    createdBy: session.admin?.username || session.createdBy || 'ECL',
    createdById: session.createdBy,
    completedAt: session.completedAt || null,
    lastUpdate: Date.now(),
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
}

async function logActivity(adminId, action, details = {}) {
  try {
    await prisma.activityLog.create({
      data: {
        adminId,
        action,
        details: details,
      },
    });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
}

// ==================== MIDDLEWARES ====================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Verificar se token foi revogado (blacklist)
  try {
    const revoked = await prisma.revokedToken.findUnique({ where: { token } });
    if (revoked) {
      return res.status(401).json({ error: 'Sessão encerrada pelo Super Admin.' });
    }
  } catch (err) { /* silencioso */ }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }

    // Dupla proteção: verificar suspension no banco em tempo real
    // (garante que admin suspenso seja bloqueado imediatamente, mesmo sem revoke explícito)
    if (user.role === 'ADMIN') {
      try {
        const admin = await prisma.admin.findUnique({
          where: { id: user.id },
          select: { status: true },
        });
        if (!admin || admin.status === 'SUSPENDED') {
          return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o Super Admin.' });
        }
      } catch { /* se falhar a checagem, continua — não bloqueia por falha de DB */ }
    }

    req.user = user;
    req.token = token;
    next();
  });
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas Super Admin.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Requer permissões de administrador.' });
  }
  next();
};

// ==================== ROTAS DE AUTENTICAÇÃO ====================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (admin.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o Super Admin.' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Salvar token ativo no banco (para poder revogar ao suspender)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      // Limpar tokens expirados desse admin antes de salvar o novo
      await prisma.activeToken.deleteMany({
        where: { adminId: admin.id, expiresAt: { lt: new Date() } },
      });
      await prisma.activeToken.create({
        data: { adminId: admin.id, token, expiresAt },
      });
    } catch { /* silencioso */ }

    await logActivity(admin.id, 'LOGIN', { username: admin.username });

    res.json({ 
      token,
      user: { id: admin.id, username: admin.username, role: admin.role }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao processar login' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ==================== ROTAS SUPER ADMIN ====================

app.get('/api/super/metrics', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [totalAdmins, activeAdmins, suspendedAdmins, totalSessions, completedSessions, inProgressSessions, terminatedSessions, totalLogs] = await Promise.all([
      prisma.admin.count({ where: { role: 'ADMIN' } }),
      prisma.admin.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
      prisma.admin.count({ where: { role: 'ADMIN', status: 'SUSPENDED' } }),
      prisma.session.count(),
      prisma.session.count({ where: { status: 'COMPLETED' } }),
      prisma.session.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.session.count({ where: { status: 'TERMINATED' } }),
      prisma.activityLog.count(),
    ]);

    res.json({
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        inProgress: inProgressSessions,
        terminated: terminatedSessions,
      },
      admins: {
        total: totalAdmins,
        active: activeAdmins,
        suspended: suspendedAdmins,
      },
      logs: totalLogs,
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

app.get('/api/super/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ admins });
  } catch (error) {
    console.error('Erro ao listar admins:', error);
    res.status(500).json({ error: 'Erro ao listar admins' });
  }
});

app.post('/api/super/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const existingAdmin = await prisma.admin.findUnique({ where: { username } });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Nome de usuário já existe' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        username,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        createdBy: req.user.id,
      },
    });

    await logActivity(req.user.id, 'CREATE_ADMIN', { 
      newAdminId: newAdmin.id, 
      newAdminUsername: username 
    });

    res.json({ 
      success: true, 
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role,
        status: newAdmin.status,
        createdAt: newAdmin.createdAt,
      }
    });
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    res.status(500).json({ error: 'Erro ao criar admin' });
  }
});

app.put('/api/super/admins/:id/suspend', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await prisma.admin.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    // Revogar TODOS os tokens ativos deste admin imediatamente
    const activeTokens = await prisma.activeToken.findMany({ where: { adminId: id } });

    if (activeTokens.length > 0) {
      // Mover para blacklist
      await prisma.revokedToken.createMany({
        data: activeTokens.map(t => ({
          adminId: t.adminId,
          token: t.token,
          revokedBy: req.user.id,
        })),
        skipDuplicates: true,
      });

      // Remover da tabela de ativos
      await prisma.activeToken.deleteMany({ where: { adminId: id } });
    }

    await logActivity(req.user.id, 'SUSPEND_ADMIN', { 
      targetAdminId: id, 
      targetAdminUsername: admin.username,
      tokensRevoked: activeTokens.length,
    });

    res.json({ success: true, admin: { id: admin.id, username: admin.username, status: admin.status } });
  } catch (error) {
    console.error('Erro ao suspender admin:', error);
    res.status(500).json({ error: 'Erro ao suspender admin' });
  }
});

app.put('/api/super/admins/:id/activate', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await prisma.admin.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    // Limpar tokens revogados deste admin para que possa logar normalmente
    await prisma.revokedToken.deleteMany({ where: { adminId: id } });

    await logActivity(req.user.id, 'ACTIVATE_ADMIN', { 
      targetAdminId: id, 
      targetAdminUsername: admin.username 
    });

    res.json({ success: true, admin: { id: admin.id, username: admin.username, status: admin.status } });
  } catch (error) {
    console.error('Erro ao reativar admin:', error);
    res.status(500).json({ error: 'Erro ao reativar admin' });
  }
});

app.delete('/api/super/admins/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await prisma.admin.delete({
      where: { id },
    });

    await logActivity(req.user.id, 'DELETE_ADMIN', { 
      deletedAdminId: id, 
      deletedAdminUsername: admin.username 
    });

    res.json({ success: true, message: 'Admin deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar admin:', error);
    res.status(500).json({ error: 'Erro ao deletar admin' });
  }
});

// ── Derrubar login de um admin (revogar token ativo) ──────────────────────────
app.post('/api/super/admins/:id/revoke-token', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { token: tokenToRevoke } = req.body; // token enviado pelo frontend

  try {
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return res.status(404).json({ error: 'Admin não encontrado' });

    if (tokenToRevoke) {
      // Revogar token específico passado pelo frontend
      await prisma.revokedToken.upsert({
        where: { token: tokenToRevoke },
        update: {},
        create: { adminId: id, token: tokenToRevoke, revokedBy: req.user.id },
      });
    }

    await logActivity(req.user.id, 'REVOKE_TOKEN', {
      targetAdminId: id,
      targetAdminUsername: admin.username,
    });

    res.json({ success: true, message: `Login de "${admin.username}" encerrado` });
  } catch (error) {
    console.error('Erro ao revogar token:', error);
    res.status(500).json({ error: 'Erro ao encerrar login' });
  }
});

// ── Listar tokens ativos de um admin (para poder revogar) ─────────────────────
// Como não guardamos tokens no DB ao logar, o super admin fornece o token
// manualmente OU o admin page envia o token atual ao fazer a requisição.
// Alternativa: buscar do header se o admin estiver logado via endpoint dedicado.

// ── Derrubar sessão → status TERMINATED ──────────────────────────────────────
app.post('/api/super/sessions/:id/terminate', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { admin: { select: { username: true } } },
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.status === 'TERMINATED') return res.status(400).json({ error: 'Sessão já foi derrubada' });

    await prisma.session.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        completedAt: new Date(),
      },
    });

    await logActivity(req.user.id, 'TERMINATE_SESSION', {
      sessionId: id,
      teamA: session.teamAName,
      teamB: session.teamBName,
      originalAdmin: session.admin?.username || session.createdBy || 'ECL',
    });

    res.json({ success: true, message: `Sessão ${session.teamAName} vs ${session.teamBName} derrubada` });
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
    res.status(500).json({ error: 'Erro ao encerrar sessão' });
  }
});

app.get('/api/super/sessions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
        admin: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      teamA: session.teamAName,
      teamB: session.teamBName,
      seriesFormat: session.seriesFormat,
      status: session.status,
      createdAt: session.createdAt,
      createdBy: session.admin?.username || session.createdBy || 'ECL',
      completedAt: session.completedAt,
      matchId: session.matchId || null,  // ID da partida ECL se criada via integração
      source: session.matchId ? 'ECL' : 'MANUAL', // origem da sessão
      actions: session.actions.map(a => ({
        map: a.map,
        team: a.team,
        action: a.action,
      })),
    }));

    res.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Erro ao listar sessões:', error);
    res.status(500).json({ error: 'Erro ao listar sessões' });
  }
});

app.get('/api/super/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        admin: {
          select: { username: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    const formattedLogs = logs.map(log => ({
      timestamp: log.createdAt,
      action: log.action,
      username: log.admin.username,
      role: log.admin.role,
      details: log.details,
    }));

    res.json({ logs: formattedLogs, total: logs.length });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

// ==================== ROTAS DE TIMES ====================

app.get('/api/teams', async (req, res) => {
  try {
    const ECL_API_URL = process.env.ECL_API_URL || 'https://ecl-backend-six.vercel.app';
    const ECL_FRONTEND_URL = process.env.ECL_FRONTEND_URL || 'https://ecl-official.vercel.app';
    
    const response = await fetch(`${ECL_API_URL}/api/v1/teams?limit=100`);
    
    if (!response.ok) {
      throw new Error('Falha ao buscar times da API ECL');
    }

    const data = await response.json();
    
    const teams = data.data.map(team => {
      let logoUrl = team.logoUrl;
      
      if (logoUrl && logoUrl.startsWith('/images/')) {
        logoUrl = `${ECL_FRONTEND_URL}${logoUrl}`;
      }
      
      return {
        id: team.id,
        name: team.name,
        tag: team.tag || team.name.substring(0, 4).toUpperCase(),
        logoUrl: logoUrl,
      };
    });

    res.json({ teams });
  } catch (error) {
    console.error('Erro ao buscar times:', error);
    res.json({ teams: [] });
  }
});

// ── Buscar sessão pelo matchId (para polling do frontend ECL) ────────────────
app.get('/api/sessions/by-match/:matchId', async (req, res) => {
  const secret = req.headers['x-ecl-secret'];
  if (secret !== (process.env.ECL_WEBHOOK_SECRET || 'ecl-picks-bans-webhook-secret')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { matchId } = req.params;

  try {
    const session = await prisma.session.findFirst({
      where: { matchId },
      orderBy: { createdAt: 'desc' }, // a mais recente
      select: { id: true, status: true },
    });

    if (!session) {
      return res.status(404).json({ status: 'NOT_FOUND' });
    }

    res.json({ sessionId: session.id, status: session.status });
  } catch (error) {
    console.error('Erro ao buscar sessão por matchId:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ==================== ROTA ECL → PICKS & BANS ====================

// Criar sessão a partir de uma partida ECL (chamada pelo backend ECL)
// Não requer autenticação de admin local — usa chave compartilhada (ECL_WEBHOOK_SECRET)
app.post('/api/sessions/from-match', async (req, res) => {
  const secret = req.headers['x-ecl-secret'];
  if (secret !== (process.env.ECL_WEBHOOK_SECRET || 'ecl-picks-bans-webhook-secret')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const {
    matchId,
    teamAName, teamBName,
    teamALogo, teamBLogo,
    teamATag,  teamBTag,
    seriesFormat,
    createdByAdminId, // ID do admin ECL que gerou (para log)
  } = req.body;

  if (!matchId || !teamAName || !teamBName || !seriesFormat) {
    return res.status(400).json({ error: 'matchId, teamAName, teamBName e seriesFormat são obrigatórios' });
  }

  if (!['BO1', 'BO3', 'BO5'].includes(seriesFormat)) {
    return res.status(400).json({ error: 'seriesFormat deve ser BO1, BO3 ou BO5' });
  }

  // Verificar se já existe sessão ativa para essa partida
  try {
    const existing = await prisma.session.findFirst({
      where: { matchId, status: 'IN_PROGRESS' },
    });
    if (existing) {
      return res.json({ sessionId: existing.id, alreadyExists: true });
    }

    const sessionId = generateSessionId();
    const ECL_FRONTEND_URL = process.env.ECL_FRONTEND_URL || 'https://ecl-official.vercel.app';

    // Resolver logos relativas para absolutas
    const resolveLogoUrl = (url) => {
      if (url && url.startsWith('/images/')) return `${ECL_FRONTEND_URL}${url}`;
      return url || null;
    };

    await prisma.session.create({
      data: {
        id: sessionId,
        teamAName,
        teamBName,
        teamATag: teamATag || teamAName.substring(0, 4).toUpperCase(),
        teamBTag: teamBTag || teamBName.substring(0, 4).toUpperCase(),
        teamALogo: resolveLogoUrl(teamALogo),
        teamBLogo: resolveLogoUrl(teamBLogo),
        seriesFormat,
        status: 'IN_PROGRESS',
        matchId,
        createdBy: 'system-ecl',    // texto livre, sem FK
        createdById: null,          // null para sessões via integração ECL
      },
    });

    res.json({ sessionId });
  } catch (error) {
    console.error('Erro ao criar sessão from-match:', error);
    res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

// ==================== ROTAS DE SESSÕES ====================

app.post('/api/sessions', authenticateToken, async (req, res) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin não tem permissão para criar sessões' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas admins podem criar sessões' });
  }

  const { teamAName, teamBName, teamALogo, teamBLogo, teamATag, teamBTag, seriesFormat } = req.body;

  if (!teamAName || !teamBName) {
    return res.status(400).json({ error: 'Nomes dos times são obrigatórios' });
  }

  if (!seriesFormat || !['BO1', 'BO3', 'BO5'].includes(seriesFormat)) {
    return res.status(400).json({ error: 'Formato de série obrigatório: BO1, BO3 ou BO5' });
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });

    if (!admin || admin.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Admin inativo ou suspenso' });
    }

    const sessionId = generateSessionId();

    const session = await prisma.session.create({
      data: {
        id: sessionId,
        teamAName,
        teamBName,
        teamATag: teamATag || teamAName.substring(0, 4).toUpperCase(),
        teamBTag: teamBTag || teamBName.substring(0, 4).toUpperCase(),
        teamALogo: teamALogo || null,
        teamBLogo: teamBLogo || null,
        seriesFormat,
        status: 'IN_PROGRESS',
        createdBy: req.user.username,   // texto livre para exibição
        createdById: req.user.id,       // FK real para Admin
      },
    });

    await logActivity(req.user.id, 'CREATE_SESSION', {
      sessionId,
      teamA: teamAName,
      teamB: teamBName,
      seriesFormat,
    });

    const sequence = getSequence(seriesFormat);

    // Formato compatível com frontend
    const formattedSession = {
      id: session.id,
      teamA: {
        id: 'A',
        name: session.teamAName,
        tag: session.teamATag,
        logoUrl: session.teamALogo,
        leader: null,
      },
      teamB: {
        id: 'B',
        name: session.teamBName,
        tag: session.teamBTag,
        logoUrl: session.teamBLogo,
        leader: null,
      },
      actions: [],
      currentTurn: sequence[0].team,
      currentAction: sequence[0].action,
      seriesFormat: session.seriesFormat,
      status: 'IN_PROGRESS',
      createdAt: session.createdAt,
      createdBy: req.user.username,
      createdById: req.user.id,
      lastUpdate: Date.now(),
    };

    res.json({ sessionId, session: formattedSession });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ error: 'Erro ao criar sessão' });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json(formatSession(session));
  } catch (error) {
    console.error('Erro ao buscar sessão:', error);
    res.status(500).json({ error: 'Erro ao buscar sessão' });
  }
});

app.post('/api/sessions/:id/join', async (req, res) => {
  const { id } = req.params;
  const { team, nickname } = req.body;

  if (team !== 'A' && team !== 'B') {
    return res.status(400).json({ error: 'Time inválido' });
  }

  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({ error: 'Nickname é obrigatório' });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { actions: true, admin: { select: { username: true } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const leaderField = team === 'A' ? 'teamALeader' : 'teamBLeader';
    
    // Só atualiza se ainda não tiver líder
    if (!session[leaderField]) {
      await prisma.session.update({
        where: { id },
        data: { [leaderField]: nickname.trim() },
      });
    }

    // Buscar sessão atualizada após join
    const updatedSession = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });

    res.json({ success: true, session: formatSession(updatedSession) });
  } catch (error) {
    console.error('Erro ao entrar na sessão:', error);
    res.status(500).json({ error: 'Erro ao entrar na sessão' });
  }
});

app.post('/api/sessions/:id/action', async (req, res) => {
  const { id } = req.params;
  const { team, map } = req.body;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Sessão já finalizada', status: session.status });
    }

    const sequence = getSequence(session.seriesFormat);
    const nextIndex = session.actions.length;
    const expectedTeam = sequence[nextIndex].team;
    const expectedAction = sequence[nextIndex].action;

    if (team !== expectedTeam) {
      return res.status(400).json({ error: 'Não é a vez deste time' });
    }

    // Verificar se mapa já foi usado
    const usedMaps = session.actions.map(a => a.map);
    if (usedMaps.includes(map)) {
      return res.status(400).json({ error: 'Mapa já foi usado' });
    }

    // Adicionar ação
    await prisma.sessionAction.create({
      data: {
        sessionId: id,
        map,
        team,
        action: expectedAction,
        order: session.actions.length + 1,
      },
    });

    // Verificar se completou (chegou ao fim da sequência)
    if (session.actions.length + 1 === sequence.length) {
      const allUsedMaps = [...usedMaps, map];
      const decider = MAPS.find(m => !allUsedMaps.includes(m));
      let deciderMap = null;

      if (decider) {
        await prisma.sessionAction.create({
          data: {
            sessionId: id,
            map: decider,
            team: 'DECIDER',
            action: 'PICK',
            order: sequence.length + 1,
          },
        });
        deciderMap = decider;
      }

      await prisma.session.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Montar lista completa de ações para o webhook
      const completedActions = [
        ...session.actions,
        { map, team, action: expectedAction, order: session.actions.length + 1 },
        ...(deciderMap ? [{ map: deciderMap, team: 'DECIDER', action: 'PICK', order: sequence.length + 1 }] : []),
      ];

      // Notificar backend ECL assincronamente (não bloqueia a resposta)
      notifyECLMatchComplete(session, completedActions).catch(e => console.error('Webhook ECL falhou:', e));
    }

    // Retornar sessão atualizada
    const updatedSession = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });

    res.json({ success: true, session: formatSession(updatedSession) });
  } catch (error) {
    console.error('Erro ao executar ação:', error);
    res.status(500).json({ error: 'Erro ao executar ação' });
  }
});

app.post('/api/sessions/:id/reset', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.sessionAction.deleteMany({
      where: { sessionId: id },
    });

    await prisma.session.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        completedAt: null,
      },
    });

    const session = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });

    res.json({ success: true, session: formatSession(session) });

    res.json({ success: true, session: formattedSession });
  } catch (error) {
    console.error('Erro ao resetar sessão:', error);
    res.status(500).json({ error: 'Erro ao resetar sessão' });
  }
});

app.get('/api/sessions/:id/poll', async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json(formatSession(session));
  } catch (error) {
    console.error('Erro no polling:', error);
    res.status(500).json({ error: 'Erro no polling' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const adminCount = await prisma.admin.count();
    const sessionCount = await prisma.session.count();
    
    res.json({ 
      status: 'ok', 
      database: 'connected',
      admins: adminCount,
      sessions: sessionCount,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const adminCount = await prisma.admin.count();
    const sessionCount = await prisma.session.count();
    
    res.json({ 
      status: 'ok', 
      database: 'connected',
      admins: adminCount,
      sessions: sessionCount,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3003;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`🚀 Servidor Picks & Bans rodando na porta ${PORT}`);
    console.log(`💾 Banco de dados: PostgreSQL (Supabase)`);
    
    try {
      const superAdmin = await prisma.admin.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });
      
      if (superAdmin) {
        console.log(`👑 Super Admin: ${superAdmin.username}`);
      }
      
      const adminCount = await prisma.admin.count({ where: { role: 'ADMIN' } });
      console.log(`👥 Admins cadastrados: ${adminCount}`);
    } catch (error) {
      console.error('⚠️  Erro ao conectar ao banco:', error.message);
    }
  });
}

module.exports = app;
