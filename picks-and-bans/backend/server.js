const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3002',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Armazenamento em memória das sessões
// NOTA: Em produção Serverless, isso será perdido entre invocações
// Para produção real, use um banco de dados (Redis, MongoDB, etc.)
const sessions = new Map();

// Credenciais admin (em produção, use banco de dados)
// Senha padrão: "admin123" (hash gerado com bcrypt)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  // Hash de "admin123" - alterar em produção via variável de ambiente
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$10$xQHj5YrJZ0FZqZQXKZ5LZOxZ1JZ3Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
};

// Secret para JWT (DEVE ser definido em produção via variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production-urgently';

// Middleware de autenticação
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

// Mapa de sequência do Pick & Ban
const SEQUENCE = [
  { team: 'A', action: 'BAN' },
  { team: 'B', action: 'BAN' },
  { team: 'A', action: 'PICK' },
  { team: 'B', action: 'PICK' },
  { team: 'B', action: 'BAN' },
  { team: 'A', action: 'BAN' },
];

const MAPS = ['Breeze', 'Dune', 'Hanami', 'Prision', 'Province', 'Rust', 'Sandstone'];

// ==================== ROTAS HTTP ====================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  // Verificar username
  if (username !== ADMIN_CREDENTIALS.username) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Para desenvolvimento, aceitar senha padrão se não houver hash configurado
  let isValidPassword = false;
  
  if (process.env.ADMIN_PASSWORD_HASH) {
    // Em produção, usar bcrypt
    isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash);
  } else {
    // Em desenvolvimento, aceitar senha simples "admin123"
    isValidPassword = password === 'admin123';
  }

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Gerar token JWT válido por 24 horas
  const token = jwt.sign(
    { username: ADMIN_CREDENTIALS.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ 
    token,
    user: { username: ADMIN_CREDENTIALS.username, role: 'admin' }
  });
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

// Buscar times cadastrados da API principal da ECL
app.get('/api/teams', async (req, res) => {
  try {
    const ECL_API_URL = process.env.ECL_API_URL || 'https://ecl-backend-six.vercel.app';
    const ECL_FRONTEND_URL = process.env.ECL_FRONTEND_URL || 'https://ecl-official.vercel.app';
    
    const response = await fetch(`${ECL_API_URL}/api/v1/teams?limit=100`);
    
    if (!response.ok) {
      throw new Error('Falha ao buscar times da API ECL');
    }

    const data = await response.json();
    
    // Retornar apenas os campos necessários e converter URLs relativas para o frontend da ECL
    const teams = data.data.map(team => {
      let logoUrl = team.logoUrl;
      
      // Se a URL for relativa (começa com /), converter para URL absoluta do frontend da ECL
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
    // Retornar array vazio em caso de erro
    res.json({ teams: [] });
  }
});

// Criar nova sessão (PROTEGIDO - requer autenticação)
app.post('/api/sessions', authenticateToken, (req, res) => {
  const { teamAName, teamBName, teamALogo, teamBLogo, teamATag, teamBTag } = req.body;

  if (!teamAName || !teamBName) {
    return res.status(400).json({ error: 'Nomes dos times são obrigatórios' });
  }

  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    teamA: {
      id: 'A',
      name: teamAName,
      tag: teamATag || teamAName.substring(0, 4).toUpperCase(),
      logoUrl: teamALogo || null,
      leader: null,
    },
    teamB: {
      id: 'B',
      name: teamBName,
      tag: teamBTag || teamBName.substring(0, 4).toUpperCase(),
      logoUrl: teamBLogo || null,
      leader: null,
    },
    actions: [],
    currentTurn: 'A',
    currentAction: 'BAN',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    lastUpdate: Date.now(),
  };

  sessions.set(sessionId, session);

  res.json({ sessionId, session });
});

// Buscar sessão por ID
app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  res.json(session);
});

// Entrar na sessão (definir líder e time)
app.post('/api/sessions/:id/join', (req, res) => {
  const { id } = req.params;
  const { team, nickname } = req.body;

  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  if (team !== 'A' && team !== 'B') {
    return res.status(400).json({ error: 'Time inválido' });
  }

  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({ error: 'Nickname é obrigatório' });
  }

  // Definir líder do time (se ainda não tiver)
  const teamKey = team === 'A' ? 'teamA' : 'teamB';
  if (!session[teamKey].leader) {
    session[teamKey].leader = nickname.trim();
  }

  session.lastUpdate = Date.now();
  sessions.set(id, session);

  res.json({ success: true, session });
});

// Fazer uma ação (BAN ou PICK)
app.post('/api/sessions/:id/action', (req, res) => {
  const { id } = req.params;
  const { team, map } = req.body;

  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  if (session.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'Sessão já finalizada' });
  }

  if (session.currentTurn !== team) {
    return res.status(400).json({ error: 'Não é a vez deste time' });
  }

  // Verificar se o mapa já foi usado
  const usedMaps = session.actions.map((a) => a.map);
  if (usedMaps.includes(map)) {
    return res.status(400).json({ error: 'Mapa já foi usado' });
  }

  // Adicionar ação
  const newAction = {
    map,
    team: session.currentTurn,
    action: session.currentAction,
    order: session.actions.length + 1,
  };

  session.actions.push(newAction);

  // Verificar se completou as 6 ações
  if (session.actions.length === 6) {
    // Encontrar o decider (mapa que sobrou) - 7 mapas total
    const allUsedMaps = session.actions.map((a) => a.map);
    const decider = MAPS.find((m) => !allUsedMaps.includes(m));

    if (decider) {
      session.actions.push({
        map: decider,
        team: 'A',
        action: 'PICK',
        order: 7,
      });
    }

    session.status = 'COMPLETED';
    session.completedAt = new Date().toISOString();
  } else {
    // Atualizar próxima jogada
    const nextIndex = session.actions.length;
    session.currentTurn = SEQUENCE[nextIndex].team;
    session.currentAction = SEQUENCE[nextIndex].action;
  }

  session.lastUpdate = Date.now();
  sessions.set(id, session);

  res.json({ success: true, session });
});

// Resetar sessão
app.post('/api/sessions/:id/reset', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  session.actions = [];
  session.currentTurn = 'A';
  session.currentAction = 'BAN';
  session.status = 'IN_PROGRESS';
  session.lastUpdate = Date.now();
  delete session.completedAt;

  sessions.set(id, session);

  res.json({ success: true, session });
});

// Polling endpoint - substitui WebSocket
app.get('/api/sessions/:id/poll', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  res.json(session);
});

// ==================== FUNÇÕES AUXILIARES ====================

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
}

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3003;

// Somente inicia servidor local se não estiver no Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Picks & Bans rodando na porta ${PORT}`);
    console.log(`📡 Modo: Polling (compatível com Vercel)`);
  });
}

// Exporta para Vercel Serverless
module.exports = app;
