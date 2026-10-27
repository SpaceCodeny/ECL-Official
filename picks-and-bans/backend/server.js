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

const SEQUENCE = [
  { team: 'A', action: 'BAN' },
  { team: 'B', action: 'BAN' },
  { team: 'A', action: 'PICK' },
  { team: 'B', action: 'PICK' },
  { team: 'B', action: 'BAN' },
  { team: 'A', action: 'BAN' },
];

const MAPS = ['Breeze', 'Dune', 'Hanami', 'Prision', 'Province', 'Rust', 'Sandstone'];

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

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
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
    const [totalAdmins, activeAdmins, suspendedAdmins, totalSessions, completedSessions, inProgressSessions, totalLogs] = await Promise.all([
      prisma.admin.count({ where: { role: 'ADMIN' } }),
      prisma.admin.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
      prisma.admin.count({ where: { role: 'ADMIN', status: 'SUSPENDED' } }),
      prisma.session.count(),
      prisma.session.count({ where: { status: 'COMPLETED' } }),
      prisma.session.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.activityLog.count(),
    ]);

    res.json({
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        inProgress: inProgressSessions,
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

    await logActivity(req.user.id, 'SUSPEND_ADMIN', { 
      targetAdminId: id, 
      targetAdminUsername: admin.username 
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
      status: session.status,
      createdAt: session.createdAt,
      createdBy: session.admin.username,
      completedAt: session.completedAt,
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

// ==================== ROTAS DE SESSÕES ====================

app.post('/api/sessions', authenticateToken, async (req, res) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin não tem permissão para criar sessões' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas admins podem criar sessões' });
  }

  const { teamAName, teamBName, teamALogo, teamBLogo, teamATag, teamBTag } = req.body;

  if (!teamAName || !teamBName) {
    return res.status(400).json({ error: 'Nomes dos times são obrigatórios' });
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
        status: 'IN_PROGRESS',
        createdBy: req.user.id,
      },
    });

    await logActivity(req.user.id, 'CREATE_SESSION', {
      sessionId,
      teamA: teamAName,
      teamB: teamBName,
    });

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
      currentTurn: 'A',
      currentAction: 'BAN',
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
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
        admin: {
          select: { username: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Calcular currentTurn e currentAction baseado nas ações
    let currentTurn = 'A';
    let currentAction = 'BAN';
    
    if (session.actions.length < 6) {
      const nextIndex = session.actions.length;
      currentTurn = SEQUENCE[nextIndex].team;
      currentAction = SEQUENCE[nextIndex].action;
    }

    const formattedSession = {
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
      actions: session.actions,
      currentTurn,
      currentAction,
      status: session.status,
      createdAt: session.createdAt,
      createdBy: session.admin.username,
      createdById: session.createdBy,
      completedAt: session.completedAt,
      lastUpdate: Date.now(),
    };

    res.json(formattedSession);
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

    // Buscar sessão atualizada
    const updatedSession = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });

    let currentTurn = 'A';
    let currentAction = 'BAN';
    
    if (updatedSession.actions.length < 6) {
      const nextIndex = updatedSession.actions.length;
      currentTurn = SEQUENCE[nextIndex].team;
      currentAction = SEQUENCE[nextIndex].action;
    }

    const formattedSession = {
      id: updatedSession.id,
      teamA: {
        id: 'A',
        name: updatedSession.teamAName,
        tag: updatedSession.teamATag,
        logoUrl: updatedSession.teamALogo,
        leader: updatedSession.teamALeader,
      },
      teamB: {
        id: 'B',
        name: updatedSession.teamBName,
        tag: updatedSession.teamBTag,
        logoUrl: updatedSession.teamBLogo,
        leader: updatedSession.teamBLeader,
      },
      actions: updatedSession.actions,
      currentTurn,
      currentAction,
      status: updatedSession.status,
      createdAt: updatedSession.createdAt,
      createdBy: updatedSession.admin.username,
      lastUpdate: Date.now(),
    };

    res.json({ success: true, session: formattedSession });
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
      return res.status(400).json({ error: 'Sessão já finalizada' });
    }

    // Verificar turno
    const nextIndex = session.actions.length;
    const expectedTeam = SEQUENCE[nextIndex].team;
    const expectedAction = SEQUENCE[nextIndex].action;

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

    // Verificar se completou
    if (session.actions.length + 1 === 6) {
      const allUsedMaps = [...usedMaps, map];
      const decider = MAPS.find(m => !allUsedMaps.includes(m));

      if (decider) {
        await prisma.sessionAction.create({
          data: {
            sessionId: id,
            map: decider,
            team: 'A',
            action: 'PICK',
            order: 7,
          },
        });
      }

      await prisma.session.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    // Buscar sessão atualizada
    const updatedSession = await prisma.session.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } }, admin: { select: { username: true } } },
    });

    let currentTurn = 'A';
    let currentAction = 'BAN';
    
    if (updatedSession.status === 'IN_PROGRESS' && updatedSession.actions.length < 6) {
      const idx = updatedSession.actions.length;
      currentTurn = SEQUENCE[idx].team;
      currentAction = SEQUENCE[idx].action;
    }

    const formattedSession = {
      id: updatedSession.id,
      teamA: {
        id: 'A',
        name: updatedSession.teamAName,
        tag: updatedSession.teamATag,
        logoUrl: updatedSession.teamALogo,
        leader: updatedSession.teamALeader,
      },
      teamB: {
        id: 'B',
        name: updatedSession.teamBName,
        tag: updatedSession.teamBTag,
        logoUrl: updatedSession.teamBLogo,
        leader: updatedSession.teamBLeader,
      },
      actions: updatedSession.actions,
      currentTurn,
      currentAction,
      status: updatedSession.status,
      createdAt: updatedSession.createdAt,
      createdBy: updatedSession.admin.username,
      completedAt: updatedSession.completedAt,
      lastUpdate: Date.now(),
    };

    res.json({ success: true, session: formattedSession });
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
      include: { actions: true, admin: { select: { username: true } } },
    });

    const formattedSession = {
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
      actions: [],
      currentTurn: 'A',
      currentAction: 'BAN',
      status: 'IN_PROGRESS',
      createdAt: session.createdAt,
      createdBy: session.admin.username,
      lastUpdate: Date.now(),
    };

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
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
        admin: {
          select: { username: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    let currentTurn = 'A';
    let currentAction = 'BAN';
    
    if (session.actions.length < 6) {
      const nextIndex = session.actions.length;
      currentTurn = SEQUENCE[nextIndex].team;
      currentAction = SEQUENCE[nextIndex].action;
    }

    const formattedSession = {
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
      actions: session.actions,
      currentTurn,
      currentAction,
      status: session.status,
      createdAt: session.createdAt,
      createdBy: session.admin.username,
      createdById: session.createdBy,
      completedAt: session.completedAt,
      lastUpdate: Date.now(),
    };

    res.json(formattedSession);
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
